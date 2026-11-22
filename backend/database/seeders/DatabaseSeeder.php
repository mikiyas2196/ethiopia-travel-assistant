<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     * Note: Tourism knowledge base tables (documents, chunks, embeddings)
     * are strictly kept empty on initial install as required.
     */
    public function run(): void
    {
        $this->call([
            AdminUserSeeder::class,
        ]);
    }
}
