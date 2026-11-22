<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Add roles and document management permissions to users table
        Schema::table('users', function (Blueprint $table) {
            $table->string('role', 50)->default('user')->after('email');
            $table->boolean('can_view_documents')->default(false)->after('role');
            $table->boolean('can_add_documents')->default(false)->after('can_view_documents');
            $table->boolean('can_edit_documents')->default(false)->after('can_add_documents');
            $table->boolean('can_delete_documents')->default(false)->after('can_edit_documents');
        });

        // 2. Set admin user with full permissions
        DB::table('users')->where('id', 1)->orWhere('email', 'admin@ethiopiatravel.com')->update([
            'role' => 'admin',
            'can_view_documents' => true,
            'can_add_documents' => true,
            'can_edit_documents' => true,
            'can_delete_documents' => true,
        ]);

        // 3. Add user_id to chat_sessions to isolate admin & user histories from guest visitors
        Schema::table('chat_sessions', function (Blueprint $table) {
            $table->foreignId('user_id')
                ->nullable()
                ->after('id')
                ->constrained('users')
                ->nullOnDelete();

            $table->index(['user_id', 'updated_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('chat_sessions', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropIndex(['user_id', 'updated_at']);
            $table->dropColumn('user_id');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'role',
                'can_view_documents',
                'can_add_documents',
                'can_edit_documents',
                'can_delete_documents',
            ]);
        });
    }
};
