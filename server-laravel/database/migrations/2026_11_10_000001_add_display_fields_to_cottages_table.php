<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cottages', function (Blueprint $table) {
            if (! Schema::hasColumn('cottages', 'middle_description')) {
                $table->mediumText('middle_description')->nullable()->after('description');
            }
            if (! Schema::hasColumn('cottages', 'about_heading')) {
                $table->string('about_heading', 160)->nullable()->after('middle_description');
            }
            if (! Schema::hasColumn('cottages', 'about_text')) {
                $table->mediumText('about_text')->nullable()->after('about_heading');
            }
            if (! Schema::hasColumn('cottages', 'about_image_media_id')) {
                $table->char('about_image_media_id', 24)->nullable()->after('about_text');
            }
            if (! Schema::hasColumn('cottages', 'overview_bullets')) {
                $table->json('overview_bullets')->nullable()->after('about_image_media_id');
            }
            if (! Schema::hasColumn('cottages', 'section_settings')) {
                $table->json('section_settings')->nullable()->after('overview_bullets');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cottages', function (Blueprint $table) {
            $cols = ['middle_description', 'about_heading', 'about_text', 'about_image_media_id', 'overview_bullets', 'section_settings'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('cottages', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

