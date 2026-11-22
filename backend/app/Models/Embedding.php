<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Embedding extends Model
{
    use HasFactory;

    protected $fillable = [
        'chunk_id',
        'embedding',
        'embedding_model',
        'dimensions',
    ];

    protected $casts = [
        'embedding' => 'array',
        'dimensions' => 'integer',
    ];

    /**
     * Get the chunk this embedding represents.
     */
    public function chunk(): BelongsTo
    {
        return $this->belongsTo(DocumentChunk::class, 'chunk_id');
    }
}
