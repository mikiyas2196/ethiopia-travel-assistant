<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ChatController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\KnowledgeBaseController;
use App\Http\Controllers\Api\UserController;
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
Route::delete('/chat/session/{sessionId}', [ChatController::class, 'clearSession']);

// Authenticated User Chat Session
Route::get('/chat/user-session', [ChatController::class, 'userSession'])->middleware('auth:sanctum');

// Public Knowledge Base Metadata & Statistics
Route::get('/knowledge-base/statistics', [KnowledgeBaseController::class, 'statistics']);
Route::get('/knowledge-base/categories', [KnowledgeBaseController::class, 'categories']);

// In-Browser Document Viewing & File Download (supports header or ?token= for iframes)
Route::get('/documents/{id}/view', [DocumentController::class, 'viewContent']);
Route::get('/documents/{id}/download', [DocumentController::class, 'downloadFile']);

// Authentication Routes
Route::post('/auth/login', [AuthController::class, 'login']);
Route::post('/auth/register', [AuthController::class, 'register']);

// Protected Routes (Users & Administrators)
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/user', [AuthController::class, 'user']);

    // Document Management Endpoints (protected by user permissions inside controller)
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::post('/documents', [DocumentController::class, 'store']);
    Route::get('/documents/{id}', [DocumentController::class, 'show']);
    Route::put('/documents/{id}', [DocumentController::class, 'update']);
    Route::post('/documents/{id}', [DocumentController::class, 'update']); // Allows multipart file upload with method override
    Route::delete('/documents/{id}', [DocumentController::class, 'destroy']);
    Route::post('/documents/{id}/reprocess', [DocumentController::class, 'reprocess']);

    // Admin-Only User & Permission Management Endpoints
    Route::get('/admin/users', [UserController::class, 'index']);
    Route::post('/admin/users', [UserController::class, 'store']);
    Route::put('/admin/users/{id}/permissions', [UserController::class, 'updatePermissions']);
    Route::post('/admin/users/bulk-permissions', [UserController::class, 'updateBulkPermissions']);
    Route::delete('/admin/users/{id}', [UserController::class, 'destroy']);
});
