<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class KnowledgeBaseTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        User::create([
            'name' => 'Administrator',
            'email' => 'admin@ethiopiatravel.com',
            'password' => Hash::make('admin123456'),
        ]);
    }

    /**
     * Test empty knowledge base returns 0 documents and appropriate statistics.
     */
    public function test_statistics_endpoint_returns_correct_empty_state(): void
    {
        $response = $this->getJson('/api/knowledge-base/statistics');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'statistics' => [
                    'total_documents' => 0,
                    'completed_documents' => 0,
                    'total_chunks' => 0,
                    'total_embeddings' => 0,
                ],
            ]);
    }

    /**
     * Test categories endpoint returns predefined tourism categories.
     */
    public function test_categories_endpoint_returns_valid_categories(): void
    {
        $response = $this->getJson('/api/knowledge-base/categories');

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
            ])
            ->assertJsonFragment(['UNESCO World Heritage & Historic Sites'])
            ->assertJsonFragment(['National Parks, Wildlife & Nature Reserves']);
    }

    /**
     * Test chat returns honest empty knowledge base notification when no documents exist.
     */
    public function test_chat_returns_empty_knowledge_base_message(): void
    {
        $response = $this->postJson('/api/chat', [
            'question' => 'What are the major attractions in Lalibela?',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'sources' => [],
            ]);

        $this->assertStringContainsString('empty', strtolower($response->json('answer')));
    }

    /**
     * Test admin login with seeded credentials.
     */
    public function test_admin_can_login_with_valid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'admin@ethiopiatravel.com',
            'password' => 'admin123456',
        ]);

        $response->assertStatus(200)
            ->assertJson([
                'success' => true,
                'message' => 'Login successful',
            ])
            ->assertJsonStructure([
                'token',
                'user' => ['id', 'name', 'email'],
            ]);
    }

    /**
     * Test document management endpoints are protected by authentication.
     */
    public function test_unauthenticated_user_cannot_access_documents_list(): void
    {
        $response = $this->getJson('/api/documents');

        $response->assertStatus(401);
    }
}
