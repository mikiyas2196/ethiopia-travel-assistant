<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\KnowledgeBaseController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

// Public Chatbot & Tourism Exploration Routes
Route::post('/chat', [ChatController::class, 'chat']);
Route::get('/chat/suggestions', [ChatController::class, 'suggestions']);
Route::get('/chat/history/{sessionId}', [ChatController::class, 'history']);

// Public Knowledge Base Metadata & Statistics (used by homepage/status)
Route::get('/knowledge-base/statistics', [KnowledgeBaseController::class, 'statistics']);
Route::get('/knowledge-base/categories', [KnowledgeBaseController::class, 'categories']);

// Authentication Routes
Route::post('/auth/login', [AuthController::class, 'login']);

// Protected Administrator Routes
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'user']);

    // Document Management Endpoints
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::get('/documents/{id}', [DocumentController::class, 'show']);
    Route::put('/documents/{id}', [DocumentController::class, 'update']);
    Route::post('/documents/{id}', [DocumentController::class, 'update']); // Allows multipart file upload with method override
    Route::delete('/documents/{id}', [DocumentController::class, 'destroy']);
    Route::post('/documents/{id}/reprocess', [DocumentController::class, 'reprocess']);
});
