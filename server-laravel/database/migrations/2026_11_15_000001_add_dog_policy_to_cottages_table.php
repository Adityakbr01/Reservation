<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cottages', function (Blueprint $table) {
            if (! Schema::hasColumn('cottages', 'dog_policy_enabled')) {
                $table->boolean('dog_policy_enabled')->default(false)->after('max_dogs');
            }
            if (! Schema::hasColumn('cottages', 'dog_policy_title')) {
                $table->string('dog_policy_title', 160)->nullable()->after('dog_policy_enabled');
            }
            if (! Schema::hasColumn('cottages', 'dog_policy_subtitle')) {
                $table->string('dog_policy_subtitle', 255)->nullable()->after('dog_policy_title');
            }
            if (! Schema::hasColumn('cottages', 'dog_fee')) {
                $table->decimal('dog_fee', 10, 2)->nullable()->default(70.00)->after('dog_policy_subtitle');
            }
            if (! Schema::hasColumn('cottages', 'dog_policy_image_media_id')) {
                $table->char('dog_policy_image_media_id', 24)->nullable()->after('dog_fee');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cottages', function (Blueprint $table) {
            $cols = ['dog_policy_enabled', 'dog_policy_title', 'dog_policy_subtitle', 'dog_fee', 'dog_policy_image_media_id'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('cottages', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

