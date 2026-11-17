<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            if (! Schema::hasColumn('site_settings', 'minimum_stay_nights')) {
                $table->unsignedInteger('minimum_stay_nights')->default(2)->after('check_out_time');
            }
        });
    }

    public function down(): void
    {
        Schema::table('site_settings', function (Blueprint $table) {
            if (Schema::hasColumn('site_settings', 'minimum_stay_nights')) {
                $table->dropColumn('minimum_stay_nights');
            }
        });
    }
};
