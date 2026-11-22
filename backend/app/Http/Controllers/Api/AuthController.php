<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * User registration.
     */
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => 'user',
            'can_view_documents' => false,
            'can_add_documents' => false,
            'can_edit_documents' => false,
            'can_delete_documents' => false,
        ]);

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Registration successful.',
            'token' => $token,
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
            ],
        ], 201);
    }

    /**
     * Admin login.
     */
    public function login(Request $request): JsonResponse
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        // Create personal access token (preserve existing sessions so multiple tabs/tests remain valid)
        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'token' => $token,
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
            ],
        ]);
    }

    /**
     * Admin/User logout.
     */
    public function logout(Request $request): JsonResponse
    {
        try {
            $user = auth('sanctum')->user() ?? $request->user('sanctum') ?? $request->user();

            if ($user) {
                $user->currentAccessToken()?->delete();
            } else {
                $tokenString = $request->bearerToken() ?: $request->input('token') ?: $request->query('token');
                if ($tokenString) {
                    $tokenRecord = \Laravel\Sanctum\PersonalAccessToken::findToken($tokenString);
                    $tokenRecord?->delete();
                }
            }
        } catch (\Throwable $e) {
            // Silently allow logout cleanup even if token resolution encounters an issue
        }

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Get current authenticated user profile and permissions.
     */
    public function user(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'success' => true,
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
            ],
        ]);
    }
}
