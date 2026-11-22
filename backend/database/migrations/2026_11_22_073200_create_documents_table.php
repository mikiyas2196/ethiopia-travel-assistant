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
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('category')->index();
            $table->string('original_filename');
            $table->string('stored_file_path');
            $table->string('file_type', 10); // pdf, xlsx, xls, csv
            $table->longText('extracted_content')->nullable();
            $table->string('processing_status', 20)->default('pending')->index(); // pending, processing, completed, failed
            $table->text('processing_error')->nullable();
            $table->string('source_name')->nullable();
            $table->string('source_url', 500)->nullable();
            $table->unsignedBigInteger('file_size')->nullable();
            $table->unsignedInteger('chunk_count')->default(0);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
