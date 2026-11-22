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

    public function __construct(
        PdfExtractionService $pdfExtractor,
        ExcelExtractionService $excelExtractor,
        ChunkingService $chunker,
        EmbeddingService $embedder
    ) {
        $this->pdfExtractor = $pdfExtractor;
        $this->excelExtractor = $excelExtractor;
        $this->chunker = $chunker;
        $this->embedder = $embedder;
    }

    /**
     * Process or reprocess a document completely:
     * extract text -> chunk -> generate embeddings -> persist.
     *
     * @param Document $document
     * @return Document
     * @throws Exception
     */
    public function process(Document $document): Document
    {
        @set_time_limit(300);

        $document->update([
            'processing_status' => 'processing',
            'processing_error' => null,
        ]);

        try {
            // 1. Locate stored physical file
            $absolutePath = Storage::disk('local')->path($document->stored_file_path);

            if (!file_exists($absolutePath)) {
                throw new Exception("Document file not found on disk at: {$document->stored_file_path}");
            }

            // 2. Extract content based on file type
            $extractedText = match (strtolower($document->file_type)) {
                'pdf' => $this->pdfExtractor->extractText($absolutePath),
                'xlsx', 'xls', 'csv' => $this->excelExtractor->extractText($absolutePath, $document->file_type),
                default => throw new Exception("Unsupported file type: {$document->file_type}"),
            };

            if (empty(trim($extractedText))) {
                throw new Exception("Extracted document content is empty.");
            }

            // 3. Clean up existing chunks and embeddings if this is a reprocess
            $document->chunks()->delete();

            // 4. Divide extracted content into chunks
            $baseMetadata = [
                'document_id' => $document->id,
                'title' => $document->title,
                'category' => $document->category,
                'source_name' => $document->source_name,
                'file_type' => $document->file_type,
            ];

            $chunkDefinitions = $this->chunker->chunk($extractedText, $baseMetadata);

            if (empty($chunkDefinitions)) {
                throw new Exception("Failed to produce text chunks from extracted content.");
            }

            // 5. Generate embeddings for chunks
            $chunkTexts = array_column($chunkDefinitions, 'content');
            $embeddings = $this->embedder->generateBatchEmbeddings($chunkTexts, 'RETRIEVAL_DOCUMENT');

            // 6. Persist chunks and embeddings inside a database transaction
            DB::transaction(function () use ($document, $extractedText, $chunkDefinitions, $embeddings) {
                $document->update([
                    'extracted_content' => $extractedText,
                    'chunk_count' => count($chunkDefinitions),
                ]);

                foreach ($chunkDefinitions as $index => $cDef) {
                    $chunk = DocumentChunk::create([
                        'document_id' => $document->id,
                        'chunk_index' => $cDef['chunk_index'],
                        'content' => $cDef['content'],
                        'metadata' => $cDef['metadata'],
                        'token_count' => $cDef['token_count'],
                    ]);

                    if (isset($embeddings[$index]) && !empty($embeddings[$index])) {
                        Embedding::create([
                            'chunk_id' => $chunk->id,
                            'embedding' => $embeddings[$index],
                            'embedding_model' => env('GEMINI_EMBEDDING_MODEL', 'gemini-embedding-001'),
                            'dimensions' => count($embeddings[$index]),
                        ]);
                    }
                }

                $document->update([
                    'processing_status' => 'completed',
                    'processing_error' => null,
                ]);
            });

            Log::info("Document processed successfully", [
                'document_id' => $document->id,
                'title' => $document->title,
                'chunks_created' => count($chunkDefinitions),
            ]);

            return $document->fresh();

        } catch (Exception $e) {
            $errorMessage = $e->getMessage();
            Log::error("Document processing failed: {$errorMessage}", ['document_id' => $document->id]);

            $document->update([
                'processing_status' => 'failed',
                'processing_error' => $errorMessage,
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
            // Delete physical file from storage
            if (Storage::disk('local')->exists($document->stored_file_path)) {
                Storage::disk('local')->delete($document->stored_file_path);
            }

            // Cascading delete takes care of chunks and embeddings
            return (bool)$document->delete();
        });
    }
}
