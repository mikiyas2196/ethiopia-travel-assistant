<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('embeddings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chunk_id')->constrained('document_chunks')->onDelete('cascade');
            $table->longText('embedding'); // JSON string of float vector
            $table->string('embedding_model', 50)->default('text-embedding-004');
            $table->unsignedInteger('dimensions')->nullable();
            $table->timestamps();

            $table->index('chunk_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('embeddings');
    }
};
