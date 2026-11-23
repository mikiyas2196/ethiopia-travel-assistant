<?php

namespace App\Services;

use App\Models\Document;
use App\Models\DocumentChunk;
use App\Models\Embedding;
use Exception;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;

class DocumentProcessingService
{
    protected PdfExtractionService $pdfExtractor;
    protected ExcelExtractionService $excelExtractor;
    protected ChunkingService $chunker;
    protected EmbeddingService $embedder;

    /**
     * How many chunks to embed and persist in each streaming batch.
     * Small batch = fewer API calls per request = less likely to hit rate limits.
     */
    protected int $streamBatchSize = 5;

    public function __construct(
        PdfExtractionService $pdfExtractor,
        ExcelExtractionService $excelExtractor,
        ChunkingService $chunker,
        EmbeddingService $embedder
    ) {
        $this->pdfExtractor  = $pdfExtractor;
        $this->excelExtractor = $excelExtractor;
        $this->chunker       = $chunker;
        $this->embedder      = $embedder;
    }

    /**
     * Process or reprocess a document:
     * extract text -> chunk -> generate embeddings in streaming batches -> persist.
     *
     * Supports RESUME: if the document already has some chunks saved (from a
     * previous partial run), skips those and only embeds the remaining ones.
     *
     * @param Document $document
     * @return Document
     * @throws Exception
     */
    public function process(Document $document): Document
    {
        @set_time_limit(0);
        @ini_set('memory_limit', '1024M');
        @ini_set('max_execution_time', '0');

        $document->update([
            'processing_status' => 'processing',
            'processing_error'  => null,
        ]);

        try {
            // 1. Locate stored physical file
            $absolutePath = Storage::disk('local')->path($document->stored_file_path);

            if (!file_exists($absolutePath)) {
                throw new Exception("Document file not found on disk at: {$document->stored_file_path}");
            }

            // 2. Extract content based on file type
            Log::info("Extracting text from document", [
                'document_id' => $document->id,
                'file_type'   => $document->file_type,
                'file_size'   => $document->file_size,
            ]);

            $extractedText = match (strtolower($document->file_type)) {
                'pdf'                => $this->pdfExtractor->extractText($absolutePath),
                'xlsx', 'xls', 'csv' => $this->excelExtractor->extractText($absolutePath, $document->file_type),
                default              => throw new Exception("Unsupported file type: {$document->file_type}"),
            };

            if (empty(trim($extractedText))) {
                throw new Exception("Extracted document content is empty.");
            }

            // 3. Build all chunk definitions
            $baseMetadata = [
                'document_id' => $document->id,
                'title'       => $document->title,
                'category'    => $document->category,
                'source_name' => $document->source_name,
                'file_type'   => $document->file_type,
            ];

            Log::info("Chunking document text", ['document_id' => $document->id]);
            $chunkDefinitions = $this->chunker->chunk($extractedText, $baseMetadata);

            if (empty($chunkDefinitions)) {
                throw new Exception("Failed to produce text chunks from extracted content.");
            }

            $totalChunks = count($chunkDefinitions);
            Log::info("Document chunked", [
                'document_id'  => $document->id,
                'total_chunks' => $totalChunks,
            ]);

            // 4. Save extracted content and chunk count immediately
            $document->update([
                'extracted_content' => $extractedText,
                'chunk_count'       => $totalChunks,
            ]);

            // 5. Find out which chunk_indexes are already saved (resume support)
            $existingIndexes = DB::table('document_chunks')
                ->where('document_id', $document->id)
                ->pluck('chunk_index')
                ->flip()
                ->toArray(); // O(1) lookup

            $pendingChunks = array_filter(
                $chunkDefinitions,
                fn($c) => !isset($existingIndexes[$c['chunk_index']])
            );
            $pendingChunks = array_values($pendingChunks);

            $alreadyDone = $totalChunks - count($pendingChunks);
            if ($alreadyDone > 0) {
                Log::info("Resuming from checkpoint: {$alreadyDone}/{$totalChunks} chunks already embedded.");
            }

            if (empty($pendingChunks)) {
                // All chunks already embedded — just mark complete
                $document->update(['processing_status' => 'completed', 'processing_error' => null]);
                Log::info("Document already fully processed — marked complete.", ['document_id' => $document->id]);
                return $document->fresh();
            }

            // 6. Stream: embed and persist pending chunks in small batches
            $chunkBatches  = array_chunk($pendingChunks, $this->streamBatchSize);
            $totalBatches  = count($chunkBatches);
            $processedCount = $alreadyDone;

            foreach ($chunkBatches as $batchIndex => $batch) {
                @set_time_limit(0);

                $batchTexts = array_column($batch, 'content');

                Log::info("Embedding batch", [
                    'document_id'    => $document->id,
                    'batch'          => $batchIndex + 1,
                    'total_batches'  => $totalBatches,
                    'chunks_in_batch' => count($batch),
                    'progress'       => "{$processedCount}/{$totalChunks}",
                ]);

                // Generate embeddings (never sleeps more than 60s)
                $embeddings = $this->embedder->generateBatchEmbeddings($batchTexts, 'RETRIEVAL_DOCUMENT');

                // Persist this batch
                DB::transaction(function () use ($document, $batch, $embeddings) {
                    foreach ($batch as $i => $cDef) {
                        $chunk = DocumentChunk::create([
                            'document_id' => $document->id,
                            'chunk_index' => $cDef['chunk_index'],
                            'content'     => $cDef['content'],
                            'metadata'    => $cDef['metadata'],
                            'token_count' => $cDef['token_count'],
                        ]);

                        if (!empty($embeddings[$i])) {
                            Embedding::create([
                                'chunk_id'        => $chunk->id,
                                'embedding'       => $embeddings[$i],
                                'embedding_model' => env('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001'),
                                'dimensions'      => count($embeddings[$i]),
                            ]);
                        }
                    }
                });

                $processedCount += count($batch);

                Log::info("Batch persisted", [
                    'document_id' => $document->id,
                    'progress'    => "{$processedCount}/{$totalChunks}",
                    'memory_mb'   => round(memory_get_usage(true) / 1024 / 1024, 1),
                ]);

                // Free memory between batches
                unset($embeddings, $batchTexts);
                gc_collect_cycles();
            }

            // 7. Mark document as completed
            $document->update([
                'processing_status' => 'completed',
                'processing_error'  => null,
            ]);

            Log::info("Document processed successfully", [
                'document_id'    => $document->id,
                'title'          => $document->title,
                'chunks_created' => $totalChunks,
            ]);

            return $document->fresh();

        } catch (Exception $e) {
            $errorMessage = $e->getMessage();
            Log::error("Document processing failed: {$errorMessage}", ['document_id' => $document->id]);

            $document->update([
                'processing_status' => 'failed',
                'processing_error'  => $errorMessage,
            ]);

            throw $e;
        }
    }

    /**
     * Delete a document, its database records, and its physical file.
     */
    public function deleteDocument(Document $document): bool
    {
        return DB::transaction(function () use ($document) {
            if (Storage::disk('local')->exists($document->stored_file_path)) {
                Storage::disk('local')->delete($document->stored_file_path);
            }
            return (bool)$document->delete();
        });
    }
}
