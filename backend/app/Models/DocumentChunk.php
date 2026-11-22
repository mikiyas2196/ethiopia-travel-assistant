<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class DocumentChunk extends Model
{
    use HasFactory;

    protected $fillable = [
        'document_id',
        'chunk_index',
        'content',
        'metadata',
        'token_count',
    ];

    protected $casts = [
        'metadata' => 'array',
        'chunk_index' => 'integer',
        'token_count' => 'integer',
    ];

    /**
     * Get the parent document.
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class, 'document_id');
    }

    /**
     * Get the vector embedding for this chunk.
     */
    public function embedding(): HasOne
    {
        return $this->hasOne(Embedding::class, 'chunk_id');
    }
}
