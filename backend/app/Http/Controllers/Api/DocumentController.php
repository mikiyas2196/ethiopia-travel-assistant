<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Services\DocumentProcessingService;
use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentController extends Controller
{
    protected DocumentProcessingService $processor;

    public function __construct(DocumentProcessingService $processor)
    {
        $this->processor = $processor;
    }

    /**
     * Display a listing of documents with optional filtering and pagination.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Document::query();

        // Filter by category
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }

        // Filter by file type
        if ($request->filled('file_type')) {
            $query->where('file_type', strtolower($request->file_type));
        }

        // Filter by status
        if ($request->filled('status')) {
            $query->where('processing_status', $request->status);
        }

        // Search in title and description
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                  ->orWhere('original_filename', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $perPage = (int)$request->input('per_page', 15);
        $documents = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return response()->json([
            'success' => true,
            'data' => $documents->items(),
            'meta' => [
                'current_page' => $documents->currentPage(),
                'last_page' => $documents->lastPage(),
                'per_page' => $documents->perPage(),
                'total' => $documents->total(),
            ],
        ]);
    }

    /**
     * Store and process a new uploaded document.
     */
    public function store(Request $request): JsonResponse
    {
        @set_time_limit(600);
        @ini_set('memory_limit', '1024M');

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'required|string',
            'file' => 'required|file|max:71680', // Support up to ~70MB
            'source_name' => 'nullable|string|max:255',
            'source_url' => 'nullable|url|max:500',
        ]);

        $uploadedFile = $request->file('file');
        $extension = strtolower($uploadedFile->getClientOriginalExtension());

        if (!in_array($extension, ['pdf', 'xlsx', 'xls', 'csv'])) {
            return response()->json([
                'message' => 'The file must be a file of type: pdf, xlsx, xls, csv.',
                'errors' => ['file' => ['The file must be a file of type: pdf, xlsx, xls, csv.']]
            ], 422);
        }

        $originalFilename = $uploadedFile->getClientOriginalName();
        $fileSize = $uploadedFile->getSize();

        // Generate safe unique filename
        $safeFileName = Str::uuid() . '.' . $extension;
        $storedFilePath = $uploadedFile->storeAs('documents', $safeFileName, 'local');

        $document = Document::create([
            'title' => $request->title,
            'description' => $request->description,
            'category' => $request->category,
            'original_filename' => $originalFilename,
            'stored_file_path' => $storedFilePath,
            'file_type' => $extension,
            'file_size' => $fileSize,
            'processing_status' => 'pending',
            'source_name' => $request->source_name,
            'source_url' => $request->source_url,
        ]);

        // Dispatch background extraction and vector embedding generation
        $this->dispatchBackgroundProcessing($document->id);

        return response()->json([
            'success' => true,
            'message' => 'Document uploaded successfully. Processing chunks and embeddings in background.',
            'document' => $document->fresh(),
        ], 201);
    }

    /**
     * Display a single document with chunk details.
     */
    public function show(int $id): JsonResponse
    {
        $document = Document::withCount('chunks')->find($id);

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found.',
            ], 404);
        }

        // Include preview chunks
        $chunks = $document->chunks()->orderBy('chunk_index')->limit(10)->get();

        return response()->json([
            'success' => true,
            'document' => $document,
            'chunks_preview' => $chunks,
        ]);
    }

    /**
     * Update document metadata or replace its file.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $document = Document::find($id);

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found.',
            ], 404);
        }

        $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'sometimes|required|string',
            'file' => 'nullable|file|max:51200',
            'source_name' => 'nullable|string|max:255',
            'source_url' => 'nullable|url|max:500',
        ]);

        $reprocessNeeded = false;

        if ($request->has('title')) {
            $document->title = $request->title;
        }
        if ($request->has('description')) {
            $document->description = $request->description;
        }
        if ($request->has('category')) {
            $document->category = $request->category;
        }
        if ($request->has('source_name')) {
            $document->source_name = $request->source_name;
        }
        if ($request->has('source_url')) {
            $document->source_url = $request->source_url;
        }

        // If a new replacement file is uploaded
        if ($request->hasFile('file')) {
            $uploadedFile = $request->file('file');
            $extension = strtolower($uploadedFile->getClientOriginalExtension());
            if (!in_array($extension, ['pdf', 'xlsx', 'xls', 'csv'])) {
                return response()->json([
                    'message' => 'The file must be a file of type: pdf, xlsx, xls, csv.',
                    'errors' => ['file' => ['The file must be a file of type: pdf, xlsx, xls, csv.']]
                ], 422);
            }
            // Delete old file
            if (Storage::disk('local')->exists($document->stored_file_path)) {
                Storage::disk('local')->delete($document->stored_file_path);
            }

            $extension = strtolower($uploadedFile->getClientOriginalExtension());
            $safeFileName = Str::uuid() . '.' . $extension;
            $document->stored_file_path = $uploadedFile->storeAs('documents', $safeFileName, 'local');
            $document->original_filename = $uploadedFile->getClientOriginalName();
            $document->file_type = $extension;
            $document->file_size = $uploadedFile->getSize();
            $reprocessNeeded = true;
        }

        $document->save();

        if ($reprocessNeeded) {
            $document->update([
                'processing_status' => 'pending',
                'processing_error' => null,
            ]);
            $this->dispatchBackgroundProcessing($document->id);
        }

        return response()->json([
            'success' => true,
            'message' => $reprocessNeeded 
                ? 'Document updated successfully. Background processing started.' 
                : 'Document metadata updated successfully.',
            'document' => $document->fresh(),
        ]);
    }

    /**
     * Delete a document and its stored assets.
     */
    public function destroy(int $id): JsonResponse
    {
        $document = Document::find($id);

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found.',
            ], 404);
        }

        $this->processor->deleteDocument($document);

        return response()->json([
            'success' => true,
            'message' => 'Document and associated embeddings deleted successfully.',
        ]);
    }

    /**
     * Retry or reprocess document extraction and embeddings in the background.
     */
    public function reprocess(int $id): JsonResponse
    {
        $document = Document::find($id);

        if (!$document) {
            return response()->json([
                'success' => false,
                'message' => 'Document not found.',
            ], 404);
        }

        $document->update([
            'processing_status' => 'pending',
            'processing_error' => null,
        ]);

        $this->dispatchBackgroundProcessing($document->id);

        return response()->json([
            'success' => true,
            'message' => 'Document reprocessing initiated in the background.',
            'document' => $document->fresh(),
        ]);
    }

    /**
     * Dispatch background CLI process for document extraction, chunking, and embedding.
     */
    protected function dispatchBackgroundProcessing(int $documentId): void
    {
        $artisanPath = base_path('artisan');
        $phpBinary = PHP_BINARY;

        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            // Windows: use start /B to detach background worker
            $cmd = "start /B \"\" \"{$phpBinary}\" \"{$artisanPath}\" document:process {$documentId} > NUL 2>&1";
            @pclose(@popen($cmd, 'r'));
        } else {
            // Linux/macOS
            $cmd = "\"{$phpBinary}\" \"{$artisanPath}\" document:process {$documentId} > /dev/null 2>&1 &";
            @exec($cmd);
        }
    }
}
