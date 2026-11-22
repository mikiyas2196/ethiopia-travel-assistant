<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ChatSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'session_id',
        'title',
    ];

    /**
     * Get messages belonging to this chat session.
     */
    public function messages(): HasMany
    {
        return $this->hasMany(ChatMessage::class, 'session_id', 'session_id');
    }
}
