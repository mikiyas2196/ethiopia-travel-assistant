<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'can_view_documents',
        'can_add_documents',
        'can_edit_documents',
        'can_delete_documents',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'can_view_documents' => 'boolean',
            'can_add_documents' => 'boolean',
            'can_edit_documents' => 'boolean',
            'can_delete_documents' => 'boolean',
        ];
    }

    /**
     * Check if user is an administrator.
     */
    public function isAdmin(): bool
    {
        return $this->role === 'admin' || $this->id === 1;
    }

    /**
     * Check if user can view knowledge base documents.
     */
    public function canViewDocuments(): bool
    {
        return $this->isAdmin() || (bool)$this->can_view_documents;
    }

    /**
     * Check if user can upload/add knowledge base documents.
     */
    public function canAddDocuments(): bool
    {
        return $this->isAdmin() || (bool)$this->can_add_documents;
    }

    /**
     * Check if user can edit document metadata or reprocess.
     */
    public function canEditDocuments(): bool
    {
        return $this->isAdmin() || (bool)$this->can_edit_documents;
    }

    /**
     * Check if user can delete documents.
     */
    public function canDeleteDocuments(): bool
    {
        return $this->isAdmin() || (bool)$this->can_delete_documents;
    }

    /**
     * Relationship to chat sessions.
     */
    public function chatSessions()
    {
        return $this->hasMany(ChatSession::class, 'user_id');
    }
}
