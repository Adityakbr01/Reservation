<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('site_settings', 'header_navigation')) {
                $table->json('header_navigation')->nullable()->after('why_book_with_us');
            }
            if (! Schema::hasColumn('site_settings', 'footer_navigation')) {
                $table->json('footer_navigation')->nullable()->after('header_navigation');
            }
            if (! Schema::hasColumn('site_settings', 'booking_acknowledgement')) {
                $table->json('booking_acknowledgement')->nullable()->after('footer_navigation');
            }
        });
    }

    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            $cols = ['header_navigation', 'footer_navigation', 'booking_acknowledgement'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('site_settings', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

