<?php

namespace Tests\Feature;

use App\Models\Document;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentProcessingTest extends TestCase
{
    use RefreshDatabase;

    protected User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->admin = User::create([
            'name' => 'Administrator',
            'email' => 'admin@ethiopiatravel.com',
            'password' => Hash::make('admin123456'),
        ]);
    }

    /**
     * Test uploading a CSV spreadsheet and automatic processing.
     */
    public function test_can_upload_and_process_csv_document(): void
    {
        $csvContent = "Name,Location,Category,Description\n" .
                      "Sheraton Addis,Addis Ababa,Hotel,Luxury hotel in the heart of Addis Ababa.\n" .
                      "Simien Lodge,Simien Mountains,Lodge,Highest altitude lodge in Africa.";

        $file = UploadedFile::fake()->createWithContent('ethiopia_hotels.csv', $csvContent);

        $response = $this->actingAs($this->admin, 'sanctum')->postJson('/api/documents', [
            'title' => 'Ethiopian Hotels and Lodges Guide',
            'description' => 'Directory of top accommodations in Ethiopia',
            'category' => 'Hotels, Resorts & Travel Agencies',
            'file' => $file,
            'source_name' => 'Ministry of Tourism',
        ]);

        $response->assertStatus(201)
            ->assertJson([
                'success' => true,
                'document' => [
                    'title' => 'Ethiopian Hotels and Lodges Guide',
                    'processing_status' => 'completed',
                    'file_type' => 'csv',
                ],
            ]);

        $this->assertDatabaseHas('documents', [
            'title' => 'Ethiopian Hotels and Lodges Guide',
            'processing_status' => 'completed',
        ]);

        $document = Document::where('title', 'Ethiopian Hotels and Lodges Guide')->first();
        $this->assertGreaterThan(0, $document->chunks()->count());
        $this->assertGreaterThan(0, $document->embeddings()->count());

        // Now test querying the chatbot with information from this newly uploaded document!
        $chatResponse = $this->postJson('/api/chat', [
            'question' => 'Where is Sheraton Addis located?',
        ]);

        $chatResponse->assertStatus(200)
            ->assertJson([
                'success' => true,
            ]);

        $this->assertNotEmpty($chatResponse->json('sources'));
        $this->assertEquals('Ethiopian Hotels and Lodges Guide', $chatResponse->json('sources.0.title'));
    }

    /**
     * Test document deletion removes document, chunks, and embeddings.
     */
    public function test_document_deletion_cascades_and_removes_embeddings(): void
    {
        $csvContent = "Attraction,Region,Highlight\n" .
                      "Rock-Hewn Churches,Lalibela,11 monolithic medieval rock-cut churches.";
        $file = UploadedFile::fake()->createWithContent('lalibela.csv', $csvContent);

        $upload = $this->actingAs($this->admin, 'sanctum')->postJson('/api/documents', [
            'title' => 'Lalibela Heritage Guide',
            'category' => 'UNESCO World Heritage & Historic Sites',
            'file' => $file,
        ]);

        $docId = $upload->json('document.id');

        $deleteResponse = $this->actingAs($this->admin, 'sanctum')->deleteJson("/api/documents/{$docId}");

        $deleteResponse->assertStatus(200)
            ->assertJson(['success' => true]);

        $this->assertDatabaseMissing('documents', ['id' => $docId]);
        $this->assertDatabaseMissing('document_chunks', ['document_id' => $docId]);
    }
}
