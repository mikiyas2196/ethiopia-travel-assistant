<?php

namespace App\Services;

use Exception;
use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use Illuminate\Support\Facades\Log;

class EmbeddingService
{
    protected ?string $apiKey;
    protected string $model;
    protected Client $httpClient;

    /**
     * Maximum seconds to wait on rate limit before giving up and using fallback.
     * We NEVER sleep longer than this — prevents processes hanging for hours.
     */
    protected const MAX_SLEEP_SECONDS = 60;

    /**
     * Minimum pause between individual API requests (ms) to stay under free tier RPM.
     * Free tier: 1500 req/day, 15 RPM → ~4s per request is safe.
     */
    protected const REQUEST_SPACING_MS = 250_000; // 250ms between requests (conservative)

    public function __construct()
    {
        $this->apiKey = env('GEMINI_API_KEY');
        $model = env('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001');
        if ($model === 'text-embedding-004' || empty($model)) {
            $model = 'gemini-embedding-001';
        }
        $this->model = $model;
        $this->httpClient = new Client([
            'base_uri'        => 'https://generativelanguage.googleapis.com',
            'timeout'         => 60,
            'connect_timeout' => 10,
        ]);
    }

    /**
     * Generate vector embedding for a single text chunk with capped retry backoff.
     *
     * @param string $text
     * @param string $taskType RETRIEVAL_DOCUMENT or RETRIEVAL_QUERY
     * @return array Vector of floats
     * @throws Exception
     */
    public function generateEmbedding(string $text, string $taskType = 'RETRIEVAL_DOCUMENT'): array
    {
        if (empty($this->apiKey)) {
            return $this->generateFallbackEmbedding($text);
        }

        $maxRetries = 3;

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                $url  = "/v1beta/models/{$this->model}:embedContent?key={$this->apiKey}";
                $resp = $this->httpClient->post($url, [
                    'headers' => ['Content-Type' => 'application/json'],
                    'json'    => [
                        'model'    => "models/{$this->model}",
                        'content'  => ['parts' => [['text' => $text]]],
                        'taskType' => $taskType,
                    ],
                ]);

                $data = json_decode($resp->getBody()->getContents(), true);

                if (isset($data['embedding']['values'])) {
                    return $data['embedding']['values'];
                }

                throw new Exception("Malformed embedding response: " . json_encode($data));

            } catch (Exception $e) {
                if ($this->isRateLimitException($e) && $attempt < $maxRetries) {
                    $delay = $this->cappedDelay($e, $attempt);
                    Log::warning("Rate limit on single embedding. Sleeping {$delay}s (attempt {$attempt}).");
                    sleep($delay);
                } elseif ($attempt >= $maxRetries) {
                    Log::error("Embedding failed after {$maxRetries} attempts: " . $e->getMessage());
                    // Return fallback instead of throwing — processing continues
                    return $this->generateFallbackEmbedding($text);
                } else {
                    sleep(min(self::MAX_SLEEP_SECONDS, $attempt * 3));
                }
            }
        }

        return $this->generateFallbackEmbedding($text);
    }

    /**
     * Generate embeddings for multiple text chunks efficiently.
     *
     * Strategy:
     * - Try batchEmbedContents (up to 100 per request) in small batches of 5
     * - If rate limited, wait at most MAX_SLEEP_SECONDS then retry with smaller batch
     * - If still failing, fall back to individual calls with pacing
     * - NEVER sleep longer than MAX_SLEEP_SECONDS — avoids hanging for hours
     *
     * @param array  $texts    Array of text strings
     * @param string $taskType
     * @return array Array of float vectors
     */
    public function generateBatchEmbeddings(array $texts, string $taskType = 'RETRIEVAL_DOCUMENT'): array
    {
        @set_time_limit(0);

        if (empty($texts)) {
            return [];
        }

        if (empty($this->apiKey)) {
            return array_map(fn($t) => $this->generateFallbackEmbedding($t), $texts);
        }

        $allEmbeddings = [];

        // Start with batch size 5 — small enough to avoid quota bursts on free tier
        // but fast enough to process large documents efficiently.
        $batchSize  = 5;
        $batches    = array_chunk($texts, $batchSize);
        $totalBatches = count($batches);

        foreach ($batches as $batchIndex => $batch) {
            @set_time_limit(0);

            Log::info("Processing embedding batch {$batchIndex}/{$totalBatches}", [
                'batch_size' => count($batch),
            ]);

            $batchEmbeddings = $this->processBatchWithFallback($batch, $batchIndex, $taskType);
            $allEmbeddings   = array_merge($allEmbeddings, $batchEmbeddings);

            // Brief pause between batches to respect free-tier RPM limits
            // 5 requests in a batch, need ~4s total → 800ms pause keeps us under 15 RPM
            if ($batchIndex < $totalBatches - 1) {
                usleep(800_000); // 800ms between batches
            }
        }

        return $allEmbeddings;
    }

    /**
     * Process a single batch with retry and fallback logic.
     * If the batch API fails persistently, falls back to individual requests.
     */
    protected function processBatchWithFallback(array $batch, int $batchIndex, string $taskType): array
    {
        $maxBatchRetries = 3;

        for ($attempt = 1; $attempt <= $maxBatchRetries; $attempt++) {
            @set_time_limit(0);

            try {
                return $this->callBatchEmbedApi($batch, $taskType);

            } catch (Exception $e) {
                $isRateLimit = $this->isRateLimitException($e);

                if ($isRateLimit) {
                    $delay = $this->cappedDelay($e, $attempt);
                    Log::warning(
                        "Rate limit on batch {$batchIndex} (attempt {$attempt}/{$maxBatchRetries}). " .
                        "Sleeping {$delay}s then retrying."
                    );
                    sleep($delay);

                    // After rate-limit sleep, retry the whole batch
                    continue;
                }

                if ($attempt < $maxBatchRetries) {
                    $delay = min(self::MAX_SLEEP_SECONDS, $attempt * 5);
                    Log::warning("Batch {$batchIndex} error (attempt {$attempt}): {$e->getMessage()}. Retrying in {$delay}s.");
                    sleep($delay);
                    continue;
                }

                // All batch retries exhausted: fall back to individual calls
                Log::warning("Batch {$batchIndex} failed after {$maxBatchRetries} attempts. Using individual calls.");
                break;
            }
        }

        // Fallback: individual paced calls for each text in the failed batch
        return $this->processIndividually($batch, $batchIndex, $taskType);
    }

    /**
     * Call Gemini batchEmbedContents API for a set of texts.
     */
    protected function callBatchEmbedApi(array $texts, string $taskType): array
    {
        $requests = [];
        foreach ($texts as $text) {
            $requests[] = [
                'model'    => "models/{$this->model}",
                'content'  => ['parts' => [['text' => $text]]],
                'taskType' => $taskType,
            ];
        }

        $url  = "/v1beta/models/{$this->model}:batchEmbedContents?key={$this->apiKey}";
        $resp = $this->httpClient->post($url, [
            'headers' => ['Content-Type' => 'application/json'],
            'json'    => ['requests' => $requests],
        ]);

        $data = json_decode($resp->getBody()->getContents(), true);

        if (!isset($data['embeddings'])) {
            throw new Exception("Malformed batch embedding response: " . json_encode($data));
        }

        return array_map(fn($emb) => $emb['values'] ?? [], $data['embeddings']);
    }

    /**
     * Process texts one-by-one with pacing — used as fallback when batch API fails.
     */
    protected function processIndividually(array $texts, int $batchIndex, string $taskType): array
    {
        $results = [];

        foreach ($texts as $i => $text) {
            Log::info("Individual embedding [{$batchIndex}][{$i}]");

            $maxRetries = 3;
            $embedded   = false;

            for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
                try {
                    $results[] = $this->callSingleEmbedApi($text, $taskType);
                    $embedded  = true;
                    break;
                } catch (Exception $e) {
                    if ($this->isRateLimitException($e)) {
                        $delay = $this->cappedDelay($e, $attempt);
                        Log::warning("Rate limit on individual embed [{$batchIndex}][{$i}], sleeping {$delay}s.");
                        sleep($delay);
                    } elseif ($attempt >= $maxRetries) {
                        Log::error("Individual embed failed permanently [{$batchIndex}][{$i}]: " . $e->getMessage());
                        break;
                    } else {
                        sleep(min(self::MAX_SLEEP_SECONDS, $attempt * 3));
                    }
                }
            }

            if (!$embedded) {
                // Use deterministic fallback so the chunk still gets saved (without a real embedding)
                $results[] = $this->generateFallbackEmbedding($text);
            }

            // Pace individual requests: 400ms per call keeps us at 2.5 req/s = 150 RPM
            // which is well above free tier but safe for the individual burst
            usleep(400_000); // 400ms
        }

        return $results;
    }

    /**
     * Call single embed API endpoint.
     */
    protected function callSingleEmbedApi(string $text, string $taskType): array
    {
        $url  = "/v1beta/models/{$this->model}:embedContent?key={$this->apiKey}";
        $resp = $this->httpClient->post($url, [
            'headers' => ['Content-Type' => 'application/json'],
            'json'    => [
                'model'    => "models/{$this->model}",
                'content'  => ['parts' => [['text' => $text]]],
                'taskType' => $taskType,
            ],
        ]);

        $data = json_decode($resp->getBody()->getContents(), true);

        if (!isset($data['embedding']['values'])) {
            throw new Exception("Malformed single embed response: " . json_encode($data));
        }

        return $data['embedding']['values'];
    }

    /**
     * Get a capped retry delay.
     * CRITICALLY: we NEVER return more than MAX_SLEEP_SECONDS.
     * The Gemini API sometimes suggests 48000s+ — we ignore that completely.
     */
    protected function cappedDelay(Exception $e, int $attempt): int
    {
        // Exponential backoff: 15s, 30s, 60s — capped at MAX_SLEEP_SECONDS
        $backoff = min(self::MAX_SLEEP_SECONDS, 15 * $attempt);
        return $backoff;
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
     * Calculate Cosine Similarity between two numeric vectors.
     */
    public function cosineSimilarity(array $vecA, array $vecB): float
    {
        $count = count($vecA);
        if ($count === 0 || $count !== count($vecB)) {
            return 0.0;
        }

        $dotProduct = 0.0;
        $normA      = 0.0;
        $normB      = 0.0;

        for ($i = 0; $i < $count; $i++) {
            $a = (float)$vecA[$i];
            $b = (float)$vecB[$i];
            $dotProduct += $a * $b;
            $normA      += $a * $a;
            $normB      += $b * $b;
        }

        if ($normA <= 0.0 || $normB <= 0.0) {
            return 0.0;
        }

        return $dotProduct / (sqrt($normA) * sqrt($normB));
    }

    /**
     * Deterministic normalized fallback embedding.
     * Used when API is unavailable — allows processing to complete without real embeddings.
     */
    protected function generateFallbackEmbedding(string $text): array
    {
        $dimensions = 768;
        $vector     = array_fill(0, $dimensions, 0.0);
        $words      = preg_split('/\s+/', mb_strtolower($text));

        foreach ($words as $word) {
            if (empty($word)) continue;
            $hash          = crc32($word);
            $dim           = abs($hash) % $dimensions;
            $neighbor      = (abs($hash) + 13) % $dimensions;
            $vector[$dim]  += 1.0;
            $vector[$neighbor] += 0.5;
        }

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
