<?php

namespace App\Services;

use App\Models\ChatMessage;
use App\Models\ChatSession;
use App\Models\Document;
use App\Models\DocumentChunk;
use App\Models\Embedding;
use Exception;
use GuzzleHttp\Client;
use Illuminate\Support\Facades\Log;

class RAGService
{
    protected EmbeddingService $embedder;
    protected ?string $apiKey;
    protected string $model;
    protected Client $httpClient;

    /**
     * Minimum cosine similarity score to qualify as relevant context.
     */
    protected float $similarityThreshold = 0.15;

    /**
     * Maximum number of chunks to retrieve for prompt context.
     */
    protected int $topK = 4;

    public function __construct(EmbeddingService $embedder)
    {
        $this->embedder = $embedder;
        $this->apiKey = env('GEMINI_API_KEY');
        $model = env('GEMINI_MODEL', 'gemini-3.5-flash-lite');
        if ($model === 'gemini-2.5-flash' || empty($model)) {
            $model = 'gemini-3.5-flash-lite';
        }
        $this->model = $model;
        $this->similarityThreshold = (float)env('RAG_SIMILARITY_THRESHOLD', 0.15);
        $this->topK = (int)env('RAG_TOP_K', 4);
        $this->httpClient = new Client([
            'base_uri' => 'https://generativelanguage.googleapis.com',
            'timeout' => 35,
        ]);
    }

    /**
     * Ask a question and receive a grounded RAG answer with conversational memory.
     *
     * @param string $question User's question
     * @param string|null $sessionId Optional chat session identifier
     * @return array ['success' => bool, 'answer' => string, 'sources' => array, 'session_id' => string]
     */
    public function ask(string $question, ?string $sessionId = null): array
    {
        $question = trim($question);
        if (empty($question)) {
            return [
                'success' => false,
                'answer' => 'Please provide a valid question about Ethiopian tourist destinations.',
                'sources' => [],
                'session_id' => $sessionId,
            ];
        }

        if (empty($sessionId)) {
            $sessionId = 'sess_' . bin2hex(random_bytes(6));
        }

        // 1. Fetch recent conversation history to provide memory context
        $chatHistory = $this->getRecentChatHistory($sessionId, 6);

        // 2. Check if knowledge base has any successfully processed documents
        $completedDocCount = Document::where('processing_status', 'completed')->count();
        if ($completedDocCount === 0) {
            $emptyMsg = "Your tourism knowledge base is empty. Upload your first tourism document to get started.";
            $this->logChatMessages($sessionId, $question, $emptyMsg, []);
            return [
                'success' => true,
                'answer' => $emptyMsg,
                'sources' => [],
                'session_id' => $sessionId,
            ];
        }

        // 3. Contextualize query if there is conversation history (e.g. resolve "its location" -> "location of Ethiopian Skylight Hotel")
        $retrievalQuery = $this->reformulateQuestionForRetrieval($question, $chatHistory);

        // 4. Generate embedding for the retrieval query
        $questionVector = $this->embedder->generateEmbedding($retrievalQuery, 'RETRIEVAL_QUERY');

        // 5. Retrieve relevant chunks using cosine similarity
        $relevantChunks = $this->retrieveRelevantChunks($questionVector);

        // 6. If no relevant chunks found above threshold, return honest fallback
        if (empty($relevantChunks)) {
            $fallbackMsg = "I couldn't find sufficient information about this topic in my current tourism knowledge base. Please try another question or check back after more documents have been added.";
            $this->logChatMessages($sessionId, $question, $fallbackMsg, []);
            return [
                'success' => true,
                'answer' => $fallbackMsg,
                'sources' => [],
                'session_id' => $sessionId,
            ];
        }

        // 7. Build context & sources list
        $contextBlocks = [];
        $sources = [];
        $seenDocIds = [];

        foreach ($relevantChunks as $item) {
            /** @var DocumentChunk $chunk */
            $chunk = $item['chunk'];
            $doc = $chunk->document;

            $contextBlocks[] = "--- Document: {$doc->title} (Category: {$doc->category}) ---\n" . $chunk->content;

            if (!isset($seenDocIds[$doc->id])) {
                $seenDocIds[$doc->id] = true;
                $sources[] = [
                    'document_id' => $doc->id,
                    'title' => $doc->title,
                    'category' => $doc->category,
                    'source_name' => $doc->source_name,
                    'source_url' => $doc->source_url,
                    'similarity' => round($item['similarity'], 3),
                ];
            }
        }

        $contextText = implode("\n\n", $contextBlocks);

        // 8. Generate answer using Gemini with grounded context and conversation history
        $answer = $this->generateGroundedAnswer($question, $contextText, $sources, $chatHistory);

        // 9. Save message to chat history
        $this->logChatMessages($sessionId, $question, $answer, $sources);

        return [
            'success' => true,
            'answer' => $answer,
            'sources' => $sources,
            'session_id' => $sessionId,
        ];
    }

    /**
     * Retrieve top-K relevant chunks above similarity threshold.
     */
    protected function retrieveRelevantChunks(array $questionVector): array
    {
        // Load all embeddings with their chunk and document
        $embeddings = Embedding::with('chunk.document')->get();

        $scoredChunks = [];

        foreach ($embeddings as $record) {
            if (!$record->chunk || !$record->chunk->document) {
                continue;
            }

            // Only search chunks from successfully completed documents
            if ($record->chunk->document->processing_status !== 'completed') {
                continue;
            }

            $chunkVector = $record->embedding;
            if (!is_array($chunkVector) || empty($chunkVector)) {
                continue;
            }

            $similarity = $this->embedder->cosineSimilarity($questionVector, $chunkVector);

            if ($similarity >= $this->similarityThreshold) {
                $scoredChunks[] = [
                    'chunk' => $record->chunk,
                    'similarity' => $similarity,
                ];
            }
        }

        // Sort descending by similarity score
        usort($scoredChunks, fn($a, $b) => $b['similarity'] <=> $a['similarity']);

        // Return top-K
        return array_slice($scoredChunks, 0, $this->topK);
    }

    /**
     * Fetch recent conversation turns for session memory.
     */
    protected function getRecentChatHistory(?string $sessionId, int $limit = 6): array
    {
        if (empty($sessionId)) {
            return [];
        }

        return ChatMessage::where('session_id', $sessionId)
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get()
            ->reverse()
            ->values()
            ->map(function ($msg) {
                return [
                    'role' => $msg->role,
                    'content' => $msg->content,
                ];
            })
            ->toArray();
    }

    /**
     * Reformulate a follow-up question into a standalone retrieval query using dialogue history.
     */
    protected function reformulateQuestionForRetrieval(string $question, array $chatHistory): string
    {
        if (empty($chatHistory) || empty($this->apiKey)) {
            return $question;
        }

        // Format recent turns
        $historyLines = [];
        foreach ($chatHistory as $msg) {
            $role = $msg['role'] === 'user' ? 'User' : 'Assistant';
            $content = mb_substr($msg['content'], 0, 300);
            $historyLines[] = "{$role}: {$content}";
        }
        $historyText = implode("\n", $historyLines);

        $prompt = <<<PROMPT
You are a search query reformulator for an Ethiopian tourism and travel assistant.
Given the previous conversation turns and the user's latest follow-up question, rewrite the question into a single standalone search query that explicitly mentions the specific destination, hotel, resort, historic church, or entity being discussed.
If the question is already fully standalone, return it as-is.
Return ONLY the standalone search query without any explanation, markdown, or quotation marks.

Conversation History:
{$historyText}

Follow-up Question: {$question}
Standalone Query:
PROMPT;

        $reformulateModels = array_values(array_unique(array_filter([
            $this->model,
            'gemini-3.5-flash-lite',
            'gemini-3-flash-preview',
            'gemini-flash-lite-latest',
        ])));

        foreach ($reformulateModels as $candidateModel) {
            try {
                $url = "/v1beta/models/{$candidateModel}:generateContent?key={$this->apiKey}";
                $response = $this->httpClient->post($url, [
                    'headers' => ['Content-Type' => 'application/json'],
                    'json' => [
                        'contents' => [
                            ['role' => 'user', 'parts' => [['text' => $prompt]]],
                        ],
                        'generationConfig' => [
                            'temperature' => 0.0,
                            'maxOutputTokens' => 80,
                        ],
                    ],
                    'timeout' => 12,
                ]);

                $data = json_decode($response->getBody()->getContents(), true);
                $rewritten = trim($this->extractCandidateText($data['candidates'][0] ?? null));

                if (!empty($rewritten) && mb_strlen($rewritten) > 3) {
                    Log::info("Conversational query reformulated with {$candidateModel}", [
                        'original' => $question,
                        'standalone' => $rewritten,
                    ]);
                    return $rewritten;
                }
            } catch (Exception $e) {
                Log::warning("Query reformulation on {$candidateModel} skipped: " . $e->getMessage());
            }
        }

        return $question;
    }

    /**
     * Generate grounded response using Google Gemini API with conversational history.
     */
    protected function generateGroundedAnswer(string $question, string $context, array $sources, array $chatHistory = []): string
    {
        if (empty($this->apiKey)) {
            // Local fallback when API key is not yet set in .env
            $sourcesSummary = implode(', ', array_column($sources, 'title'));
            return "Based on your uploaded tourism knowledge base ({$sourcesSummary}):\n\n" .
                "Here is the relevant excerpt retrieved from your documents:\n\n" .
                mb_substr($context, 0, 500) . "...\n\n" .
                "*(Configure GEMINI_API_KEY in backend/.env for AI synthesized responses).*";
        }

        $historyBlock = '';
        if (!empty($chatHistory)) {
            $historyLines = [];
            foreach ($chatHistory as $msg) {
                $role = $msg['role'] === 'user' ? 'User' : 'Assistant';
                $historyLines[] = "{$role}: {$msg['content']}";
            }
            $historyBlock = "CONVERSATION HISTORY (RECENT TURNS):\n=========================================\n" . implode("\n", $historyLines) . "\n=========================================\n\n";
        }

        $systemPrompt = <<<PROMPT
You are the Ethiopian Tourist Destination Assistant, a warm, highly knowledgeable, and accurate AI travel guide for Ethiopia.

Your job is to answer user questions about Ethiopian tourist destinations, historic sites, national parks, lakes, cultural events, hotels, resorts, and travel agencies.

CONVERSATIONAL MEMORY & GROUNDING INSTRUCTIONS:
1. You have access to recent CONVERSATION HISTORY. Maintain natural conversational continuity across turns.
2. If the user asks a follow-up question referencing a destination or entity discussed earlier (using pronouns such as "it", "its", "their", "the hotel", "the park", "that place"), resolve the reference using the CONVERSATION HISTORY.
3. Base all factual information (names, locations, addresses, phone numbers, ratings, historical facts) STRICTLY on the RETRIEVED TOURISM DOCUMENTS provided below.
4. Do not invent facts, destinations, or contact details not supported by the context.
5. If the retrieved context does not contain enough information to answer the question, clearly state:
   "I couldn't find sufficient information about this topic in my current tourism knowledge base. Please try another question or check back after more documents have been added."

CRITICAL FORMATTING RULES (STRICT COMPLIANCE REQUIRED):
- DO NOT use double asterisks "**" anywhere in your response. Never write "**Historical Significance:**", "**Location:**", "**Note:**", or "**Hotel Name**".
- DO NOT nest asterisks like "*   **Title:**".
- To emphasize titles, names, or section headers, write them as clean, capitalized headings on their own line followed by a colon (for example: "Historical Significance:", "Location and Accessibility:", "Contact Information:").
- For lists and key points, use clean single dashes with a space ("- Point 1") or numbered lists ("1.", "2.").
- Write in clean, elegant, readable prose with generous paragraph spacing.
- Provide a warm, welcoming tone reflecting authentic Ethiopian hospitality.
PROMPT;

        $userPrompt = <<<PROMPT
{$historyBlock}CONTEXT FROM RETRIEVED TOURISM DOCUMENTS:
=========================================
{$context}
=========================================

LATEST USER QUESTION:
{$question}
PROMPT;

        $modelsToTry = array_values(array_unique(array_filter([
            $this->model,
            'gemini-3.5-flash-lite',
            'gemini-3-flash-preview',
            'gemini-flash-lite-latest',
            'gemini-3.5-flash',
        ])));

        $lastError = null;

        foreach ($modelsToTry as $candidateModel) {
            $maxAttemptsForModel = 2;

            for ($attempt = 1; $attempt <= $maxAttemptsForModel; $attempt++) {
                try {
                    $url = "/v1beta/models/{$candidateModel}:generateContent?key={$this->apiKey}";

                    $response = $this->httpClient->post($url, [
                        'headers' => ['Content-Type' => 'application/json'],
                        'json' => [
                            'contents' => [
                                [
                                    'role' => 'user',
                                    'parts' => [
                                        ['text' => $systemPrompt . "\n\n" . $userPrompt],
                                    ],
                                ],
                            ],
                            'generationConfig' => [
                                'temperature' => 0.2,
                                'maxOutputTokens' => 4096,
                            ],
                        ],
                        'timeout' => 30,
                    ]);

                    $data = json_decode($response->getBody()->getContents(), true);
                    $candidateText = $this->extractCandidateText($data['candidates'][0] ?? null);

                    if (!empty(trim($candidateText))) {
                        return $this->sanitizeOutputText(trim($candidateText));
                    }
                } catch (Exception $e) {
                    $lastError = $e->getMessage();
                    $is503 = str_contains($lastError, '503') || str_contains(strtolower($lastError), 'high demand');
                    $is429 = str_contains($lastError, '429') || str_contains(strtolower($lastError), 'resource_exhausted') || str_contains(strtolower($lastError), 'quota');

                    if (($is503 || $is429) && $attempt < $maxAttemptsForModel) {
                        Log::warning("Gemini 503/429 demand spike on {$candidateModel} (attempt {$attempt}/{$maxAttemptsForModel}). Pausing 1.5s before retry...");
                        usleep(1_500_000); // 1.5 second pause for brief spikes
                        continue;
                    }

                    Log::warning("Gemini generation on model {$candidateModel} failed: {$lastError}. Trying next fallback candidate...");
                    break;
                }
            }
        }

        Log::error("All Gemini Generation models failed: " . $lastError);

        // Grounded graceful fallback: Serve directly from retrieved context so the user is never stranded
        $sourcesTitles = array_column($sources, 'title');
        $sourcesSummary = !empty($sourcesTitles) ? implode(', ', array_unique($sourcesTitles)) : 'Ethiopian Tourism Documents';

        $cleanContext = $this->sanitizeOutputText($context);
        $excerpt = mb_substr($cleanContext, 0, 1000);

        return "Here is the relevant information retrieved directly from your tourism knowledge base ({$sourcesSummary}):\n\n" .
            $excerpt . "...\n\n" .
            "- Notice: AI synthesis is currently experiencing temporary high demand on Google servers. The above information was retrieved directly from your verified documents.";
    }

    /**
     * Safely extract all generated text from candidate parts, concatenating all text parts and ignoring thinking tokens.
     */
    protected function extractCandidateText(?array $candidate): string
    {
        if (empty($candidate) || empty($candidate['content']['parts']) || !is_array($candidate['content']['parts'])) {
            return '';
        }

        $textParts = [];
        foreach ($candidate['content']['parts'] as $part) {
            // Ignore thinking / reasoning traces if present
            if (!empty($part['thought'])) {
                continue;
            }
            if (isset($part['text']) && is_string($part['text'])) {
                $textParts[] = $part['text'];
            }
        }

        return implode('', $textParts);
    }

    /**
     * Clean and normalize output text to remove raw markdown asterisks and nested artifacts.
     */
    protected function sanitizeOutputText(string $text): string
    {
        // 1. Convert nested bullet asterisks "*   **Title:**" into "- Title:"
        $cleaned = preg_replace('/^\s*[*+-]\s+\*\*(.*?)\*\*:?/m', '- $1:', $text);

        // 2. Remove all remaining double asterisks "**word**" -> "word"
        $cleaned = preg_replace('/\*\*(.*?)\*\*/', '$1', $cleaned);

        // 3. Remove standalone markdown bold tags that might be unclosed
        $cleaned = str_replace('**', '', $cleaned);

        // 4. Clean up any remaining leading bullet asterisks "* " into "- "
        $cleaned = preg_replace('/^\s*\*\s+/m', '- ', $cleaned);

        return trim($cleaned);
    }

    /**
     * Persist chat session and messages with user account ownership.
     */
    protected function logChatMessages(?string $sessionId, string $question, string $answer, array $sources): void
    {
        if (empty($sessionId)) {
            return;
        }

        try {
            $userId = auth('sanctum')->id();

            $session = ChatSession::where('session_id', $sessionId)->first();
            if (!$session) {
                ChatSession::create([
                    'session_id' => $sessionId,
                    'user_id' => $userId,
                    'title' => mb_substr($question, 0, 50),
                ]);
            } else if ($userId && !$session->user_id) {
                $session->update(['user_id' => $userId]);
            }

            ChatMessage::create([
                'session_id' => $sessionId,
                'role' => 'user',
                'content' => $question,
            ]);

            ChatMessage::create([
                'session_id' => $sessionId,
                'role' => 'assistant',
                'content' => $answer,
                'sources' => $sources,
            ]);
        } catch (Exception $e) {
            Log::warning("Could not persist chat message: " . $e->getMessage());
        }
    }
}
