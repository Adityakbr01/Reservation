<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cottages', function (Blueprint $table) {
            if (! Schema::hasColumn('cottages', 'dog_fees')) {
                $table->json('dog_fees')->nullable()->after('dog_fee');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cottages', function (Blueprint $table) {
            if (Schema::hasColumn('cottages', 'dog_fees')) {
                $table->dropColumn('dog_fees');
            }
        });
    }
};
