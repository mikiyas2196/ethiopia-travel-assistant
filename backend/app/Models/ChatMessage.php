<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatMessage extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id',
        'role',
        'content',
        'sources',
    ];

    protected $casts = [
        'sources' => 'array',
    ];

    /**
     * Get the session this message belongs to.
     */
    public function session(): BelongsTo
    {
        return $this->belongsTo(ChatSession::class, 'session_id', 'session_id');
    }
}
