<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'title',
        'description',
        'category',
        'original_filename',
        'stored_file_path',
        'file_type',
        'extracted_content',
        'processing_status',
        'processing_error',
        'source_name',
        'source_url',
        'file_size',
        'chunk_count',
    ];

    protected $casts = [
        'file_size' => 'integer',
        'chunk_count' => 'integer',
    ];

    /**
     * Get chunks belonging to this document.
     */
    public function chunks(): HasMany
    {
        return $this->hasMany(DocumentChunk::class, 'document_id');
    }

    /**
     * Get embeddings associated with this document through its chunks.
     */
    public function embeddings(): HasManyThrough
    {
        return $this->hasManyThrough(Embedding::class, DocumentChunk::class, 'document_id', 'chunk_id');
    }
}
