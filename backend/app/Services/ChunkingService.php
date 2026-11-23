<?php

namespace App\Services;

class ChunkingService
{
    /**
     * Target chunk size in characters (approx 700-800 tokens, assuming ~4 chars per token).
     * Larger chunks reduce total chunk count for large documents, lowering API call volume.
     */
    protected int $targetChunkSize = 3200;

    /**
     * Overlap size in characters (approx 75-100 tokens).
     */
    protected int $overlapSize = 300;

    /**
     * Minimum chunk size to avoid tiny trailing fragments.
     */
    protected int $minChunkSize = 200;

    public function __construct(int $targetChunkSize = 3200, int $overlapSize = 300)
    {
        $this->targetChunkSize = $targetChunkSize;
        $this->overlapSize = $overlapSize;
    }

    /**
     * Split document text into chunks preserving semantic coherence.
     *
     * @param string $text Full extracted text
     * @param array $baseMetadata Metadata about document (title, category, etc.)
     * @return array Array of chunk definitions: ['content' => ..., 'metadata' => ..., 'token_count' => ...]
     */
    public function chunk(string $text, array $baseMetadata = []): array
    {
        $text = trim($text);
        if (empty($text)) {
            return [];
        }

        // If the document is structured records (e.g. Excel/CSV hotels, resorts, sites)
        if (str_contains($text, '--- Record ')) {
            return $this->chunkRecords($text, $baseMetadata);
        }

        // Split text into semantic blocks:
        // Priority 1: Double line breaks (paragraphs) or page boundaries (--- Page \d+ ---)
        $blocks = preg_split('/(\n\s*\n|(?=--- Page\s+\d+ ---))/', $text);
        $blocks = array_filter(array_map('trim', $blocks), fn($b) => !empty($b));

        $chunks = [];
        $currentChunk = '';
        $currentMetadata = $baseMetadata;
        $chunkIndex = 0;

        foreach ($blocks as $block) {
            // Track page markers if present in this block
            if (preg_match('/--- Page (\d+) ---/', $block, $pageMatch)) {
                $currentMetadata['page'] = (int)$pageMatch[1];
            }

            // If a single block is longer than the target size, split by sentences
            if (mb_strlen($block) > $this->targetChunkSize) {
                // If there is existing buffer, flush it first
                if (!empty(trim($currentChunk))) {
                    $chunks[] = $this->formatChunk($currentChunk, $chunkIndex++, $currentMetadata);
                    $currentChunk = '';
                }

                $sentenceChunks = $this->splitLongBlock($block);
                foreach ($sentenceChunks as $sChunk) {
                    $chunks[] = $this->formatChunk($sChunk, $chunkIndex++, $currentMetadata);
                }
                continue;
            }

            // Check if adding block exceeds targetChunkSize
            if (mb_strlen($currentChunk) + mb_strlen($block) + 2 > $this->targetChunkSize) {
                if (!empty(trim($currentChunk))) {
                    $chunks[] = $this->formatChunk($currentChunk, $chunkIndex++, $currentMetadata);

                    // Add overlap from previous chunk's tail
                    $overlapText = $this->extractOverlap($currentChunk);
                    $currentChunk = $overlapText . "\n\n" . $block;
                } else {
                    $currentChunk = $block;
                }
            } else {
                if (empty($currentChunk)) {
                    $currentChunk = $block;
                } else {
                    $currentChunk .= "\n\n" . $block;
                }
            }
        }

        // Flush remaining buffer
        if (!empty(trim($currentChunk))) {
            $chunks[] = $this->formatChunk($currentChunk, $chunkIndex++, $currentMetadata);
        }

        return $chunks;
    }

    /**
     * Chunk structured records (e.g., Excel/CSV rows) keeping whole records intact.
     */
    protected function chunkRecords(string $text, array $baseMetadata): array
    {
        $blocks = preg_split('/(?=(?:--- Record \d+ ---|=== Sheet: ))/', $text);
        $blocks = array_filter(array_map('trim', $blocks), fn($b) => !empty($b));

        $chunks = [];
        $currentChunk = '';
        $currentMetadata = $baseMetadata;
        $chunkIndex = 0;
        // Optimal size for 2-3 full structured records per chunk (~800 tokens, well below 2048 model limit)
        $recordTargetSize = 3400;

        foreach ($blocks as $block) {
            if (preg_match('/=== Sheet: ([^=\n]+) ===/', $block, $sheetMatch)) {
                $currentMetadata['sheet'] = trim($sheetMatch[1]);
            }

            if (mb_strlen($currentChunk) + mb_strlen($block) + 2 > $recordTargetSize && !empty(trim($currentChunk))) {
                $chunks[] = $this->formatChunk($currentChunk, $chunkIndex++, $currentMetadata);
                $currentChunk = $block;
            } else {
                $currentChunk = empty($currentChunk) ? $block : $currentChunk . "\n\n" . $block;
            }
        }

        if (!empty(trim($currentChunk))) {
            $chunks[] = $this->formatChunk($currentChunk, $chunkIndex++, $currentMetadata);
        }

        return $chunks;
    }

    /**
     * Split very long continuous blocks by sentences.
     */
    protected function splitLongBlock(string $block): array
    {
        $sentences = preg_split('/(?<=[.!?])\s+/', $block);
        $result = [];
        $buf = '';

        foreach ($sentences as $sentence) {
            if (mb_strlen($buf) + mb_strlen($sentence) + 1 > $this->targetChunkSize) {
                if (!empty(trim($buf))) {
                    $result[] = trim($buf);
                    $buf = $this->extractOverlap($buf) . ' ' . $sentence;
                } else {
                    // Even a single sentence is huge, split by word
                    $result[] = trim($sentence);
                    $buf = '';
                }
            } else {
                $buf .= (empty($buf) ? '' : ' ') . $sentence;
            }
        }

        if (!empty(trim($buf))) {
            $result[] = trim($buf);
        }

        return $result;
    }

    /**
     * Extract overlap tail from a chunk.
     */
    protected function extractOverlap(string $text): string
    {
        if (mb_strlen($text) <= $this->overlapSize) {
            return '';
        }

        $tail = mb_substr($text, -$this->overlapSize);
        // Find first word boundary to avoid cut-off word
        $firstSpace = mb_strpos($tail, ' ');
        if ($firstSpace !== false && $firstSpace < mb_strlen($tail) - 10) {
            return mb_substr($tail, $firstSpace + 1);
        }

        return $tail;
    }

    /**
     * Format a chunk with calculated metadata and estimated token count.
     */
    protected function formatChunk(string $content, int $index, array $meta): array
    {
        $content = trim($content);
        // Approximation: 1 token ≈ 4 characters
        $tokenEstimate = (int)ceil(mb_strlen($content) / 4);

        $chunkMeta = array_merge($meta, [
            'chunk_index' => $index,
            'char_length' => mb_strlen($content),
        ]);

        return [
            'chunk_index' => $index,
            'content' => $content,
            'metadata' => $chunkMeta,
            'token_count' => $tokenEstimate,
        ];
    }
}
