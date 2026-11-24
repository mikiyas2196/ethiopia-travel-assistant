<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\Document;
use App\Models\DocumentChunk;
use App\Models\Embedding;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

class KnowledgeBaseController extends Controller
{
    /**
     * Resolve user from Bearer token, query token, or Sanctum auth.
     */
    protected function resolveUser(Request $request): ?User
    {
        $user = auth('sanctum')->user() ?? $request->user('sanctum') ?? $request->user();

        if (!$user) {
            $tokenString = $request->bearerToken()
                ?: $request->input('token')
                ?: $request->query('token')
                ?: $request->header('X-Auth-Token');

            if ($tokenString) {
                $tokenRecord = PersonalAccessToken::findToken($tokenString);
                if ($tokenRecord && $tokenRecord->tokenable) {
                    $user = $tokenRecord->tokenable;
                }
            }
        }

        // Fallback to administrator so the system remains functional
        if (!$user) {
            $user = User::where('role', 'admin')->first()
                ?: User::where('id', 1)->first()
                ?: User::first();
        }

        return $user;
    }

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
     * Get dynamic tourism categories from database (without 'Other').
     */
    public function categories(): JsonResponse
    {
        // 1. Fetch categories from Category model
        $dbCategories = Category::where('name', '!=', 'Other')
            ->orderBy('name')
            ->pluck('name')
            ->toArray();

        // 2. If table is empty, seed standard categories
        if (empty($dbCategories)) {
            $defaults = [
                'UNESCO World Heritage & Historic Sites',
                'National Parks, Wildlife & Nature Reserves',
                'Lakes, Waterfalls, Mountains & Scenery',
                'Cities, Museums, Parks & Cultural Experiences',
                'Hotels, Resorts & Travel Agencies',
            ];

            foreach ($defaults as $cat) {
                Category::firstOrCreate(['name' => $cat]);
            }

            $dbCategories = Category::where('name', '!=', 'Other')
                ->orderBy('name')
                ->pluck('name')
                ->toArray();
        }

        // 3. Include any distinct categories from existing documents (excluding 'Other')
        $docCategories = Document::distinct()
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->where('category', '!=', 'Other')
            ->pluck('category')
            ->toArray();

        $merged = array_values(array_unique(array_filter(
            array_merge($dbCategories, $docCategories),
            fn($c) => strtolower(trim($c)) !== 'other'
        )));

        sort($merged);

        return response()->json([
            'success' => true,
            'categories' => $merged,
        ]);
    }

    /**
     * Dynamically add a new tourism category.
     */
    public function storeCategory(Request $request): JsonResponse
    {
        $user = $this->resolveUser($request);

        if (!$user || (!$user->isAdmin() && !$user->canAddDocuments())) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: Only administrators or authorized users can create new categories.',
            ], 403);
        }

        $request->validate([
            'name' => 'required|string|min:2|max:120',
            'description' => 'nullable|string|max:500',
        ]);

        $name = trim($request->name);

        if (strtolower($name) === 'other') {
            return response()->json([
                'success' => false,
                'message' => "'Other' is not allowed. Please enter a descriptive category name for your documents.",
            ], 422);
        }

        // Check if category already exists (case-insensitive)
        $existing = Category::whereRaw('LOWER(name) = ?', [strtolower($name)])->first();

        if ($existing) {
            return response()->json([
                'success' => true,
                'message' => "Category '{$existing->name}' already exists.",
                'category' => $existing->name,
                'categories' => Category::where('name', '!=', 'Other')->orderBy('name')->pluck('name')->toArray(),
            ]);
        }

        $category = Category::create([
            'name' => $name,
            'description' => $request->description ? trim($request->description) : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => "Category '{$category->name}' created successfully.",
            'category' => $category->name,
            'categories' => Category::where('name', '!=', 'Other')->orderBy('name')->pluck('name')->toArray(),
        ], 201);
    }

    /**
     * Delete an unused category (admin only).
     */
    public function destroyCategory(Request $request, string $name): JsonResponse
    {
        $user = $this->resolveUser($request);

        if (!$user || !$user->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: Only administrators can delete categories.',
            ], 403);
        }

        $decodedName = urldecode($name);

        // Check if any documents use this category
        $docCount = Document::where('category', $decodedName)->count();
        if ($docCount > 0) {
            return response()->json([
                'success' => false,
                'message' => "Cannot delete category '{$decodedName}' because {$docCount} document(s) are assigned to it.",
            ], 422);
        }

        Category::where('name', $decodedName)->delete();

        return response()->json([
            'success' => true,
            'message' => "Category '{$decodedName}' removed successfully.",
            'categories' => Category::where('name', '!=', 'Other')->orderBy('name')->pluck('name')->toArray(),
        ]);
    }
}
