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
        $this->model = env('GEMINI_EMBEDDING_MODEL', 'text-embedding-004');
        $this->httpClient = new Client([
            'base_uri' => 'https://generativelanguage.googleapis.com',
            'timeout' => 30,
        ]);
    }

    /**
     * Generate vector embedding for a single text chunk.
     *
     * @param string $text
     * @param string $taskType RETRIEVAL_DOCUMENT or RETRIEVAL_QUERY
     * @return array Vector of floats
     * @throws Exception
     */
    public function generateEmbedding(string $text, string $taskType = 'RETRIEVAL_DOCUMENT'): array
    {
        if (empty($this->apiKey)) {
            // If GEMINI_API_KEY is not set, log warning and generate deterministic normalized pseudo-embedding
            // so local development or initial testing can function smoothly if needed
            Log::warning('GEMINI_API_KEY not configured. Generating deterministic fallback embedding.');
            return $this->generateFallbackEmbedding($text);
        }

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
            Log::error("Gemini Embedding API Error: " . $e->getMessage(), ['model' => $this->model]);
            throw new Exception("Failed to generate embedding with Gemini: " . $e->getMessage());
        }
    }

    /**
     * Generate embeddings for multiple text chunks in batches.
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

        // Process in chunks of 50 to respect Gemini batch API limits
        $batchSize = 50;
        $allEmbeddings = [];
        $chunks = array_chunk($texts, $batchSize);

        foreach ($chunks as $chunk) {
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
                } else {
                    // Fallback to one-by-one if batch format differs
                    foreach ($chunk as $text) {
                        $allEmbeddings[] = $this->generateEmbedding($text, $taskType);
                    }
                }

            } catch (Exception $e) {
                Log::warning("Batch embedding API failed, falling back to individual calls: " . $e->getMessage());
                foreach ($chunk as $text) {
                    $allEmbeddings[] = $this->generateEmbedding($text, $taskType);
                }
            }
        }

        return $allEmbeddings;
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
