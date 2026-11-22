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

        // Isolate user & admin chat sessions from guest visitors
        $currentUserId = auth('sanctum')->id();
        if ($session->user_id && $session->user_id !== $currentUserId) {
            return response()->json([
                'success' => false,
                'message' => 'This chat history is private to the account holder.',
                'messages' => [],
            ], 403);
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
     * Get or initialize the active chat session and history for the authenticated user/admin.
     */
    public function userSession(): JsonResponse
    {
        $user = auth('sanctum')->user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthenticated',
            ], 401);
        }

        // Find existing latest session for this user
        $session = ChatSession::where('user_id', $user->id)
            ->orderBy('updated_at', 'desc')
            ->first();

        if (!$session) {
            $sessionId = 'sess_u' . $user->id . '_' . bin2hex(random_bytes(6));
            $session = ChatSession::create([
                'session_id' => $sessionId,
                'user_id' => $user->id,
                'title' => 'New Conversation',
            ]);
        }

        $messages = ChatMessage::where('session_id', $session->session_id)
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json([
            'success' => true,
            'session_id' => $session->session_id,
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
            $currentUserId = auth('sanctum')->id();
            if ($session->user_id && $session->user_id !== $currentUserId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Unauthorized to clear this session.',
                ], 403);
            }

            $session->messages()->delete();
            $session->delete();
        }

        return response()->json([
            'success' => true,
            'message' => 'Chat session history cleared successfully.',
        ]);
    }
}
