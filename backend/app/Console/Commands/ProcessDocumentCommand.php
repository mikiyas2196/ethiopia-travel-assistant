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
        @set_time_limit(0);
        @ini_set('memory_limit', '1024M');

        $id = (int)$this->argument('id');
        $document = Document::find($id);

        if (!$document) {
            $this->error("Document with ID {$id} not found.");
            return 1;
        }

        $this->info("Starting async background processing for document #{$id}: {$document->title} ({$document->original_filename})");

        try {
            $processor->process($document);
            $this->info("Document #{$id} processed and embedded successfully.");
            return 0;
        } catch (Throwable $e) {
            $this->error("Document #{$id} processing failed: " . $e->getMessage());
            return 1;
        }
    }
}
