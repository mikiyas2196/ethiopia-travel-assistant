<?php

namespace Tests\Unit;

use App\Services\ChunkingService;
use App\Services\EmbeddingService;
use PHPUnit\Framework\TestCase;

class RAGUnitTest extends TestCase
{
    /**
     * Test chunking splits long text into appropriate chunks with overlap.
     */
    public function test_chunking_service_creates_valid_chunks(): void
    {
        $chunker = new ChunkingService(500, 100);
        $sampleText = "Lalibela is a town in Amhara Region, northern Ethiopia. It is known for its monolithic rock-hewn churches.\n\n" .
                      "The churches of Lalibela were built during the reign of Saint Gebre Mesqel Lalibela in the late 12th and early 13th centuries.\n\n" .
                      "UNESCO designated the rock-hewn churches of Lalibela a World Heritage Site in 1978. It remains an active place of pilgrimage.";

        $chunks = $chunker->chunk($sampleText, ['title' => 'Lalibela Guide']);

        $this->assertNotEmpty($chunks);
        $this->assertEquals(0, $chunks[0]['chunk_index']);
        $this->assertArrayHasKey('content', $chunks[0]);
        $this->assertArrayHasKey('metadata', $chunks[0]);
        $this->assertArrayHasKey('token_count', $chunks[0]);
    }

    /**
     * Test cosine similarity calculation.
     */
    public function test_cosine_similarity_identifies_identical_and_orthogonal_vectors(): void
    {
        $embedder = new EmbeddingService();

        // Identical vectors should have similarity = 1.0
        $vecA = [1.0, 2.0, 3.0, 4.0];
        $vecB = [1.0, 2.0, 3.0, 4.0];
        $simIdentical = $embedder->cosineSimilarity($vecA, $vecB);
        $this->assertEqualsWithDelta(1.0, $simIdentical, 0.0001);

        // Orthogonal vectors should have similarity = 0.0
        $vecC = [1.0, 0.0];
        $vecD = [0.0, 1.0];
        $simOrthogonal = $embedder->cosineSimilarity($vecC, $vecD);
        $this->assertEqualsWithDelta(0.0, $simOrthogonal, 0.0001);
    }
}
