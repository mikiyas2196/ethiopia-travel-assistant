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
    protected int $topK = 6;

    public function __construct(EmbeddingService $embedder)
    {
        $this->embedder = $embedder;
        $this->apiKey = env('GEMINI_API_KEY');
        $this->model = env('GEMINI_MODEL', 'gemini-2.5-flash');
        $this->similarityThreshold = (float)env('RAG_SIMILARITY_THRESHOLD', 0.15);
        $this->topK = (int)env('RAG_TOP_K', 6);
        $this->httpClient = new Client([
            'base_uri' => 'https://generativelanguage.googleapis.com',
            'timeout' => 45,
        ]);
    }

    /**
     * Ask a question and receive a grounded RAG answer.
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

        // 1. Check if knowledge base has any successfully processed documents
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

        // 2. Generate embedding for the question
        $questionVector = $this->embedder->generateEmbedding($question, 'RETRIEVAL_QUERY');

        // 3. Retrieve relevant chunks using cosine similarity
        $relevantChunks = $this->retrieveRelevantChunks($questionVector);

        // 4. If no relevant chunks found above threshold, return honest fallback
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

        // 5. Build context & sources list
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

        // 6. Generate answer using Gemini with grounded context
        $answer = $this->generateGroundedAnswer($question, $contextText, $sources);

        // 7. Save message to chat history
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
     * Generate grounded response using Google Gemini API.
     */
    protected function generateGroundedAnswer(string $question, string $context, array $sources): string
    {
        if (empty($this->apiKey)) {
            // Local fallback when API key is not yet set in .env
            $sourcesSummary = implode(', ', array_column($sources, 'title'));
            return "Based on your uploaded tourism knowledge base ({$sourcesSummary}):\n\n" .
                "Here is the relevant excerpt retrieved from your documents:\n\n" .
                mb_substr($context, 0, 500) . "...\n\n" .
                "*(Configure GEMINI_API_KEY in backend/.env for AI synthesized responses).*";
        }

        $systemPrompt = <<<PROMPT
You are the **Ethiopian Tourist Destination Assistant**, a friendly, highly knowledgeable, and accurate AI travel guide for Ethiopia.

Your job is to answer user questions about Ethiopian tourist destinations, historic sites, national parks, lakes, cultural events, hotels, resorts, and travel agencies.

CRITICAL INSTRUCTIONS:
1. Base your answer EXCLUSIVELY on the provided context retrieved from the database.
2. Do not invent facts, destinations, historical dates, or contact details not supported by the context.
3. If the context does not contain enough information to answer the question, clearly state:
   "I couldn't find sufficient information about this topic in my current tourism knowledge base. Please try another question or check back after more documents have been added."
4. Format long answers cleanly using clear paragraphs, bold highlights, and bullet points where helpful.
5. Provide a warm, welcoming tone suitable for tourists and travelers exploring Ethiopia.
PROMPT;

        $userPrompt = <<<PROMPT
CONTEXT FROM RETRIEVED TOURISM DOCUMENTS:
=========================================
{$context}
=========================================

USER QUESTION:
{$question}
PROMPT;

        try {
            $url = "/v1beta/models/{$this->model}:generateContent?key={$this->apiKey}";

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
                        'maxOutputTokens' => 1500,
                    ],
                ],
            ]);

            $data = json_decode($response->getBody()->getContents(), true);

            $candidateText = $data['candidates'][0]['content']['parts'][0]['text'] ?? null;

            if (!empty($candidateText)) {
                return trim($candidateText);
            }

            throw new Exception("Empty response candidate received from Gemini API.");

        } catch (Exception $e) {
            Log::error("Gemini Generation API Error: " . $e->getMessage());
            return "An error occurred while contacting the AI service: " . $e->getMessage();
        }
    }

    /**
     * Persist chat session and messages.
     */
    protected function logChatMessages(?string $sessionId, string $question, string $answer, array $sources): void
    {
        if (empty($sessionId)) {
            return;
        }

        try {
            ChatSession::firstOrCreate(
                ['session_id' => $sessionId],
                ['title' => mb_substr($question, 0, 50)]
            );

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
