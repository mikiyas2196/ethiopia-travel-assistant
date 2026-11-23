<?php

namespace App\Console\Commands;

use App\Models\Document;
use App\Services\DocumentProcessingService;
use Illuminate\Console\Command;
use Throwable;

class ProcessDocumentCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'document:process {id : The ID of the document to process}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Process document extraction, chunking, and vector embedding generation in the background';

    /**
     * Execute the console command.
     */
    public function handle(DocumentProcessingService $processor): int
    {
        // Ensure no timeout or memory limit interferes with large PDF processing
        @set_time_limit(0);
        @ini_set('memory_limit', '1024M');
        @ini_set('max_execution_time', '0');

        $id = (int)$this->argument('id');
        $document = Document::find($id);

        if (!$document) {
            $this->error("Document with ID {$id} not found.");
            return 1;
        }

        $this->info(
            "Starting background processing for document #{$id}: " .
            "{$document->title} ({$document->original_filename}, " .
            round($document->file_size / 1024 / 1024, 2) . " MB)"
        );

        $startTime = microtime(true);

        try {
            $result = $processor->process($document);

            $elapsed = round(microtime(true) - $startTime, 1);

            $this->info(
                "Document #{$id} processed successfully. " .
                "Chunks: {$result->chunk_count}. " .
                "Time: {$elapsed}s. " .
                "Memory: " . round(memory_get_peak_usage(true) / 1024 / 1024, 1) . " MB peak."
            );

            return 0;
        } catch (Throwable $e) {
            $elapsed = round(microtime(true) - $startTime, 1);
            $this->error(
                "Document #{$id} processing failed after {$elapsed}s: " . $e->getMessage()
            );
            return 1;
        }
    }
}
