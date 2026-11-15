<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cottages', function (Blueprint $table) {
            if (! Schema::hasColumn('cottages', 'extras')) {
                $table->json('extras')->nullable()->after('dog_policy_image_media_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cottages', function (Blueprint $table) {
            if (Schema::hasColumn('cottages', 'extras')) {
                $table->dropColumn('extras');
            }
        });
    }
};

