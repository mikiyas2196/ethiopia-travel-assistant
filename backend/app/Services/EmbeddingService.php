<?php

namespace App\Services;

use Exception;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class EmbeddingService
{
    protected ?string $apiKey;
    protected string $model;
    protected Client $httpClient;

    public function __construct()
    {
        $this->apiKey = env('GEMINI_API_KEY');
        $model = env('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001');
        // Map old or deprecated model name to current active model
        if ($model === 'text-embedding-004' || empty($model)) {
            $model = 'gemini-embedding-001';
        }
        $this->model = $model;
        $this->httpClient = new Client([
            'base_uri' => 'https://generativelanguage.googleapis.com',
            'timeout' => 30,
        ]);
    }

    /**
     * Generate vector embedding for a single text chunk with rate limit backoff.
     *
     * @param string $text
     * @param string $taskType RETRIEVAL_DOCUMENT or RETRIEVAL_QUERY
     * @return array Vector of floats
     * @throws Exception
     */
    public function generateEmbedding(string $text, string $taskType = 'RETRIEVAL_DOCUMENT'): array
    {
        if (empty($this->apiKey)) {
            Log::warning('GEMINI_API_KEY not configured. Generating deterministic fallback embedding.');
            return $this->generateFallbackEmbedding($text);
        }

        $maxRetries = 4;
        $attempt = 0;

        while ($attempt < $maxRetries) {
            $attempt++;
            try {
                $url = "/v1beta/models/{$this->model}:embedContent?key={$this->apiKey}";

                $response = $this->httpClient->post($url, [
                    'headers' => [
                        'Content-Type' => 'application/json',
                    ],
                    'json' => [
                        'model' => "models/{$this->model}",
                        'content' => [
                            'parts' => [
                                ['text' => $text],
                            ],
                        ],
                        'taskType' => $taskType,
                    ],
                ]);

                $data = json_decode($response->getBody()->getContents(), true);

                if (isset($data['embedding']['values'])) {
                    return $data['embedding']['values'];
                }

                throw new Exception("Malformed embedding response from Gemini API: " . json_encode($data));

            } catch (Exception $e) {
                $isRateLimit = $this->isRateLimitException($e);

                if ($isRateLimit && $attempt < $maxRetries) {
                    $delay = $this->extractRetryDelay($e, $attempt);
                    Log::warning("Gemini single embedding rate limit encountered (429). Retrying in {$delay}s (attempt {$attempt}/{$maxRetries})...");
                    sleep($delay);
                    continue;
                }

                if ($attempt >= $maxRetries) {
                    Log::error("Gemini Embedding API Error: " . $e->getMessage(), ['model' => $this->model]);
                    throw new Exception("Failed to generate embedding with Gemini: " . $e->getMessage());
                }

                sleep($attempt * 2);
            }
        }

        throw new Exception("Failed to generate embedding with Gemini after {$maxRetries} attempts.");
    }

    /**
     * Generate embeddings for multiple text chunks in batches with rate limiting & backoff.
     *
     * @param array $texts Array of text strings
     * @param string $taskType
     * @return array Array of float vectors
     * @throws Exception
     */
    public function generateBatchEmbeddings(array $texts, string $taskType = 'RETRIEVAL_DOCUMENT'): array
    {
        if (empty($texts)) {
            return [];
        }

        if (empty($this->apiKey)) {
            return array_map(fn($t) => $this->generateFallbackEmbedding($t), $texts);
        }

        // Safe batch size of 15 to stay well below Gemini Free Tier 100 requests/minute quota
        $batchSize = 15;
        $allEmbeddings = [];
        $chunks = array_chunk($texts, $batchSize);

        foreach ($chunks as $bIndex => $chunk) {
            $maxRetries = 5;
            $attempt = 0;
            $batchSuccess = false;

            while (!$batchSuccess && $attempt < $maxRetries) {
                $attempt++;
                try {
                    $requests = [];
                    foreach ($chunk as $text) {
                        $requests[] = [
                            'model' => "models/{$this->model}",
                            'content' => [
                                'parts' => [
                                    ['text' => $text],
                                ],
                            ],
                            'taskType' => $taskType,
                        ];
                    }

                    $url = "/v1beta/models/{$this->model}:batchEmbedContents?key={$this->apiKey}";

                    $response = $this->httpClient->post($url, [
                        'headers' => ['Content-Type' => 'application/json'],
                        'json' => ['requests' => $requests],
                    ]);

                    $data = json_decode($response->getBody()->getContents(), true);

                    if (isset($data['embeddings'])) {
                        foreach ($data['embeddings'] as $emb) {
                            $allEmbeddings[] = $emb['values'] ?? [];
                        }
                        $batchSuccess = true;
                    } else {
                        throw new Exception("Malformed batch embedding response: " . json_encode($data));
                    }

                } catch (Exception $e) {
                    $isRateLimit = $this->isRateLimitException($e);

                    if ($isRateLimit && $attempt < $maxRetries) {
                        $delay = $this->extractRetryDelay($e, $attempt);
                        Log::warning("Gemini batch embedding rate limit encountered (429). Retrying batch {$bIndex} in {$delay}s (attempt {$attempt}/{$maxRetries})...");
                        sleep($delay);
                    } else if ($attempt < $maxRetries) {
                        $delay = $attempt * 3;
                        Log::warning("Gemini batch embedding transient error: {$e->getMessage()}. Retrying in {$delay}s...");
                        sleep($delay);
                    } else {
                        // After retries exhausted on batch API, fallback to individually paced calls
                        Log::warning("Batch embedding API failed after {$maxRetries} attempts, falling back to paced individual calls: " . $e->getMessage());
                        foreach ($chunk as $text) {
                            $allEmbeddings[] = $this->generateEmbedding($text, $taskType);
                            usleep(400000); // 400ms pause between fallback calls
                        }
                        $batchSuccess = true;
                    }
                }
            }

            // Polite delay between batches to avoid rate limit spikes
            usleep(1200000);
        }

        return $allEmbeddings;
    }

    /**
     * Check if exception is due to rate limits or quota exhaustion.
     */
    protected function isRateLimitException(Exception $e): bool
    {
        $msg = strtolower($e->getMessage());
        return str_contains($msg, '429') 
            || str_contains($msg, 'too many requests') 
            || str_contains($msg, 'resource_exhausted') 
            || str_contains($msg, 'quota');
    }

    /**
     * Extract retry delay suggested by Gemini API or calculate exponential backoff.
     */
    protected function extractRetryDelay(Exception $e, int $attempt): int
    {
        $body = $e->getMessage();
        if ($e instanceof \GuzzleHttp\Exception\ClientException && $e->hasResponse()) {
            $body = (string)$e->getResponse()->getBody();
            $json = json_decode($body, true);
            if (isset($json['error']['details'])) {
                foreach ($json['error']['details'] as $detail) {
                    if (isset($detail['retryDelay'])) {
                        $seconds = (float)rtrim($detail['retryDelay'], 's');
                        return (int)ceil($seconds) + 1;
                    }
                }
            }
        }

        if (preg_match('/retry in ([\d\.]+)s/i', $body, $matches)) {
            return (int)ceil((float)$matches[1]) + 1;
        }

        return min(30, ($attempt * 7) + 6);
    }

    /**
     * Calculate Cosine Similarity between two numeric vectors.
     *
     * @param array $vecA
     * @param array $vecB
     * @return float Similarity score between -1.0 and 1.0 (typically 0.0 to 1.0 for embeddings)
     */
    public function cosineSimilarity(array $vecA, array $vecB): float
    {
        $count = count($vecA);
        if ($count === 0 || $count !== count($vecB)) {
            return 0.0;
        }

        $dotProduct = 0.0;
        $normA = 0.0;
        $normB = 0.0;

        for ($i = 0; $i < $count; $i++) {
            $a = (float)$vecA[$i];
            $b = (float)$vecB[$i];

            $dotProduct += $a * $b;
            $normA += $a * $a;
            $normB += $b * $b;
        }

        if ($normA <= 0.0 || $normB <= 0.0) {
            return 0.0;
        }

        return $dotProduct / (sqrt($normA) * sqrt($normB));
    }

    /**
     * Deterministic, normalized fallback embedding generator for testing without live API keys.
     * Generates a 768-dimensional normalized unit vector based on text token hash distribution.
     */
    protected function generateFallbackEmbedding(string $text): array
    {
        $dimensions = 768;
        $vector = array_fill(0, $dimensions, 0.0);
        $words = preg_split('/\s+/', mb_strtolower($text));

        foreach ($words as $word) {
            if (empty($word)) continue;
            $hash = crc32($word);
            $dim = abs($hash) % $dimensions;
            $vector[$dim] += 1.0;
            // Spread hash signal slightly to neighboring dimensions
            $neighbor = (abs($hash) + 13) % $dimensions;
            $vector[$neighbor] += 0.5;
        }

        // Normalize to unit vector
        $sumSq = 0.0;
        foreach ($vector as $val) {
            $sumSq += $val * $val;
        }

        if ($sumSq > 0.0) {
            $norm = sqrt($sumSq);
            for ($i = 0; $i < $dimensions; $i++) {
                $vector[$i] = round($vector[$i] / $norm, 6);
            }
        } else {
            $vector[0] = 1.0;
        }

        return $vector;
    }
}
