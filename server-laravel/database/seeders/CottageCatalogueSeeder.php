<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class CottageCatalogueSeeder extends Seeder
{
    public function run(): void
    {
        $sqlPath = database_path('cottages-catalogue.sql');
        if (file_exists($sqlPath)) {
            DB::unprepared(file_get_contents($sqlPath));
        }
    }
}

