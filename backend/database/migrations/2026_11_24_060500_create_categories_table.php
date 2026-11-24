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
        if (!Schema::hasTable('categories')) {
            Schema::create('categories', function (Blueprint $table) {
                $table->id();
                $table->string('name')->unique();
                $table->text('description')->nullable();
                $table->timestamps();
            });

            // Seed default tourism categories (without 'Other')
            $defaultCategories = [
                'UNESCO World Heritage & Historic Sites',
                'National Parks, Wildlife & Nature Reserves',
                'Lakes, Waterfalls, Mountains & Scenery',
                'Cities, Museums, Parks & Cultural Experiences',
                'Hotels, Resorts & Travel Agencies',
            ];

            $now = now();
            foreach ($defaultCategories as $categoryName) {
                DB::table('categories')->insertOrIgnore([
                    'name' => $categoryName,
                    'description' => null,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
