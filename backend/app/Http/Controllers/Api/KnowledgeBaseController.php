<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Document;
use App\Models\DocumentChunk;
use App\Models\Embedding;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class KnowledgeBaseController extends Controller
{
    /**
     * Get real-time dynamic statistics about the tourism knowledge base.
     */
    public function statistics(): JsonResponse
    {
        $totalDocuments = Document::count();
        $completedDocuments = Document::where('processing_status', 'completed')->count();
        $pendingDocuments = Document::where('processing_status', 'pending')->orWhere('processing_status', 'processing')->count();
        $failedDocuments = Document::where('processing_status', 'failed')->count();

        $totalChunks = DocumentChunk::count();
        $totalEmbeddings = Embedding::count();

        // Breakdown by category
        $categoriesBreakdown = Document::select('category', DB::raw('count(*) as count'))
            ->groupBy('category')
            ->pluck('count', 'category')
            ->toArray();

        // Breakdown by file type
        $fileTypesBreakdown = Document::select('file_type', DB::raw('count(*) as count'))
            ->groupBy('file_type')
            ->pluck('count', 'file_type')
            ->toArray();

        // Recent 5 documents
        $recentDocuments = Document::orderBy('created_at', 'desc')
            ->limit(5)
            ->get(['id', 'title', 'category', 'file_type', 'processing_status', 'chunk_count', 'created_at']);

        return response()->json([
            'success' => true,
            'statistics' => [
                'total_documents' => $totalDocuments,
                'completed_documents' => $completedDocuments,
                'pending_documents' => $pendingDocuments,
                'failed_documents' => $failedDocuments,
                'total_chunks' => $totalChunks,
                'total_embeddings' => $totalEmbeddings,
                'categories_breakdown' => $categoriesBreakdown,
                'file_types_breakdown' => $fileTypesBreakdown,
                'recent_documents' => $recentDocuments,
            ],
        ]);
    }

    /**
     * Get predefined tourism categories.
     */
    public function categories(): JsonResponse
    {
        $categories = [
            'UNESCO World Heritage & Historic Sites',
            'National Parks, Wildlife & Nature Reserves',
            'Lakes, Waterfalls, Mountains & Scenery',
            'Cities, Museums, Parks & Cultural Experiences',
            'Hotels, Resorts & Travel Agencies',
            'Other',
        ];

        return response()->json([
            'success' => true,
            'categories' => $categories,
        ]);
    }
}
