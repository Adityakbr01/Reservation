<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('site_settings') && ! Schema::hasColumn('site_settings', 'home_page')) {
            Schema::table('site_settings', function (Blueprint $table) {
                $table->json('home_page')->nullable()->after('booking_page');
            });
        }

        if (Schema::hasTable('cottages') && ! Schema::hasColumn('cottages', 'home_section')) {
            Schema::table('cottages', function (Blueprint $table) {
                $table->string('home_section', 50)->default('section_1')->after('status');
            });
        }

        try {
            DB::statement('CREATE OR REPLACE VIEW room_types AS SELECT * FROM cottages');
        } catch (\Throwable) {
            // View creation optional if restricted
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('site_settings') && Schema::hasColumn('site_settings', 'home_page')) {
            Schema::table('site_settings', function (Blueprint $table) {
                $table->dropColumn('home_page');
            });
        }

        if (Schema::hasTable('cottages') && Schema::hasColumn('cottages', 'home_section')) {
            Schema::table('cottages', function (Blueprint $table) {
                $table->dropColumn('home_section');
            });
        }

        try {
            DB::statement('CREATE OR REPLACE VIEW room_types AS SELECT * FROM cottages');
        } catch (\Throwable) {
        }
    }
};
