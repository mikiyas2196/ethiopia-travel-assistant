<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * List all users with their roles and document permissions (Admin only).
     */
    public function index(Request $request): JsonResponse
    {
        $currentUser = $request->user();

        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: Administrator access required.',
            ], 403);
        }

        $users = User::orderBy('id', 'asc')->get()->map(function ($u) {
            return [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'role' => $u->role,
                'is_admin' => $u->isAdmin(),
                'can_view_documents' => $u->canViewDocuments(),
                'can_add_documents' => $u->canAddDocuments(),
                'can_edit_documents' => $u->canEditDocuments(),
                'can_delete_documents' => $u->canDeleteDocuments(),
                'created_at' => $u->created_at->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'users' => $users,
        ]);
    }

    /**
     * Admin creates a new user with specific document permissions.
     */
    public function store(Request $request): JsonResponse
    {
        $currentUser = $request->user();

        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: Administrator access required.',
            ], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => 'nullable|string|in:admin,user',
            'can_view_documents' => 'nullable|boolean',
            'can_add_documents' => 'nullable|boolean',
            'can_edit_documents' => 'nullable|boolean',
            'can_delete_documents' => 'nullable|boolean',
        ]);

        $role = $validated['role'] ?? 'user';
        $isAdminRole = $role === 'admin';

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $role,
            'can_view_documents' => $isAdminRole || (bool)($validated['can_view_documents'] ?? false),
            'can_add_documents' => $isAdminRole || (bool)($validated['can_add_documents'] ?? false),
            'can_edit_documents' => $isAdminRole || (bool)($validated['can_edit_documents'] ?? false),
            'can_delete_documents' => $isAdminRole || (bool)($validated['can_delete_documents'] ?? false),
        ]);

        return response()->json([
            'success' => true,
            'message' => "User '{$user->name}' created successfully.",
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'is_admin' => $user->isAdmin(),
                'can_view_documents' => $user->canViewDocuments(),
                'can_add_documents' => $user->canAddDocuments(),
                'can_edit_documents' => $user->canEditDocuments(),
                'can_delete_documents' => $user->canDeleteDocuments(),
                'created_at' => $user->created_at->toISOString(),
            ],
        ], 201);
    }

    /**
     * Update user document permissions and role (Admin only).
     */
    public function updatePermissions(Request $request, int $id): JsonResponse
    {
        $currentUser = $request->user();

        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: Administrator access required.',
            ], 403);
        }

        $targetUser = User::find($id);

        if (!$targetUser) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        // Prevent modifying primary admin user role/permissions
        if ($targetUser->id === 1 && $currentUser->id !== 1) {
            return response()->json([
                'success' => false,
                'message' => 'Cannot modify primary administrator account.',
            ], 403);
        }

        $validated = $request->validate([
            'role' => ['nullable', 'string', 'in:admin,user'],
            'can_view_documents' => ['required', 'boolean'],
            'can_add_documents' => ['required', 'boolean'],
            'can_edit_documents' => ['required', 'boolean'],
            'can_delete_documents' => ['required', 'boolean'],
        ]);

        $role = $validated['role'] ?? $targetUser->role;
        $isAdminRole = ($role === 'admin' || $targetUser->id === 1);

        $targetUser->update([
            'role' => $isAdminRole ? 'admin' : $role,
            'can_view_documents' => $isAdminRole || $validated['can_view_documents'],
            'can_add_documents' => $isAdminRole || $validated['can_add_documents'],
            'can_edit_documents' => $isAdminRole || $validated['can_edit_documents'],
            'can_delete_documents' => $isAdminRole || $validated['can_delete_documents'],
        ]);

        return response()->json([
            'success' => true,
            'message' => "Permissions updated successfully for {$targetUser->name}.",
            'user' => [
                'id' => $targetUser->id,
                'name' => $targetUser->name,
                'email' => $targetUser->email,
                'role' => $targetUser->role,
                'is_admin' => $targetUser->isAdmin(),
                'can_view_documents' => $targetUser->canViewDocuments(),
                'can_add_documents' => $targetUser->canAddDocuments(),
                'can_edit_documents' => $targetUser->canEditDocuments(),
                'can_delete_documents' => $targetUser->canDeleteDocuments(),
            ],
        ]);
    }

    /**
     * Delete a user (Admin only).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $currentUser = $request->user();

        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: Administrator access required.',
            ], 403);
        }

        if ($id === $currentUser->id || $id === 1) {
            return response()->json([
                'success' => false,
                'message' => 'You cannot delete your own account or the primary administrator.',
            ], 400);
        }

        $targetUser = User::find($id);

        if (!$targetUser) {
            return response()->json([
                'success' => false,
                'message' => 'User not found.',
            ], 404);
        }

        $userName = $targetUser->name;
        $targetUser->tokens()->delete();
        $targetUser->delete();

        return response()->json([
            'success' => true,
            'message' => "User '{$userName}' has been deleted.",
        ]);
    }

    /**
     * Bulk update permissions for multiple or all users (Admin only).
     */
    public function updateBulkPermissions(Request $request): JsonResponse
    {
        $currentUser = $request->user();

        if (!$currentUser || !$currentUser->isAdmin()) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized: Administrator access required.',
            ], 403);
        }

        $validated = $request->validate([
            'user_ids' => ['nullable', 'array'],
            'user_ids.*' => ['integer'],
            'target_all' => ['nullable', 'boolean'],
            'action' => ['nullable', 'string', 'in:grant_all,revoke_all,custom'],
            'can_view_documents' => ['nullable', 'boolean'],
            'can_add_documents' => ['nullable', 'boolean'],
            'can_edit_documents' => ['nullable', 'boolean'],
            'can_delete_documents' => ['nullable', 'boolean'],
        ]);

        $query = User::where('id', '!=', 1); // Never demote primary admin

        if (empty($validated['target_all']) && !empty($validated['user_ids'])) {
            $query->whereIn('id', $validated['user_ids']);
        }

        $action = $validated['action'] ?? 'custom';
        $updates = [];

        if ($action === 'grant_all') {
            $updates = [
                'can_view_documents' => true,
                'can_add_documents' => true,
                'can_edit_documents' => true,
                'can_delete_documents' => true,
            ];
        } elseif ($action === 'revoke_all') {
            $updates = [
                'can_view_documents' => false,
                'can_add_documents' => false,
                'can_edit_documents' => false,
                'can_delete_documents' => false,
            ];
        } else {
            // Custom toggles
            if (isset($validated['can_view_documents'])) {
                $updates['can_view_documents'] = (bool)$validated['can_view_documents'];
            }
            if (isset($validated['can_add_documents'])) {
                $updates['can_add_documents'] = (bool)$validated['can_add_documents'];
            }
            if (isset($validated['can_edit_documents'])) {
                $updates['can_edit_documents'] = (bool)$validated['can_edit_documents'];
            }
            if (isset($validated['can_delete_documents'])) {
                $updates['can_delete_documents'] = (bool)$validated['can_delete_documents'];
            }
        }

        if (empty($updates)) {
            return response()->json([
                'success' => false,
                'message' => 'No permission updates specified.',
            ], 422);
        }

        $affectedCount = $query->update($updates);

        return response()->json([
            'success' => true,
            'message' => "Successfully updated permissions for {$affectedCount} user(s).",
            'affected_count' => $affectedCount,
        ]);
    }
}
