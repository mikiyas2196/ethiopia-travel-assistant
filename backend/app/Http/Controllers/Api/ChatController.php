<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Services\RAGService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    protected RAGService $ragService;

    public function __construct(RAGService $ragService)
    {
        $this->ragService = $ragService;
    }

    /**
     * Ask a question to the RAG chatbot.
     */
    public function chat(Request $request): JsonResponse
    {
        $request->validate([
            'question' => 'required|string|max:1000',
            'session_id' => 'nullable|string|max:100',
        ]);

        $question = $request->input('question');
        $sessionId = $request->input('session_id');

        $result = $this->ragService->ask($question, $sessionId);

        return response()->json($result);
    }

    /**
     * Get suggested questions for the chat interface.
     */
    public function suggestions(): JsonResponse
    {
        $suggestions = [
            'What are the major tourist attractions and UNESCO World Heritage sites in Ethiopia?',
            'Tell me about Lalibela and its historic rock-hewn churches.',
            'Where is Simien Mountains National Park located and what wildlife can be seen there?',
            'What activities and monasteries can tourists explore around Lake Tana?',
            'Which national parks and nature reserves are recorded in the knowledge base?',
            'What hotels, resorts, or accommodations are listed in Addis Ababa?',
            'Which travel agencies in Ethiopia can assist with tour bookings?',
            'What is the significance of Axum and the Tiya archaeological sites?',
        ];

        return response()->json([
            'success' => true,
            'suggestions' => $suggestions,
        ]);
    }

    /**
     * Get chat history for a session.
     */
    public function history(string $sessionId): JsonResponse
    {
        $session = ChatSession::where('session_id', $sessionId)->first();

        if (!$session) {
            return response()->json([
                'success' => true,
                'messages' => [],
            ]);
        }

        $messages = ChatMessage::where('session_id', $sessionId)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'messages' => $messages,
        ]);
    }

    /**
     * Clear all messages and the session record.
     */
    public function clearSession(string $sessionId): JsonResponse
    {
        $session = ChatSession::where('session_id', $sessionId)->first();

        if ($session) {
            $session->messages()->delete();
            $session->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Chat session history cleared successfully.',
        ]);
    }
}
