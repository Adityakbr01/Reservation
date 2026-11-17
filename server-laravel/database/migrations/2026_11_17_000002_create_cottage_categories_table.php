<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('cottage_categories')) {
            Schema::create('cottage_categories', function (Blueprint $table) {
                $table->string('id', 36)->primary();
                $table->string('name', 191);
                $table->string('slug', 191)->unique();
                $table->text('description')->nullable();
                $table->boolean('allow_multiple')->default(true);
                $table->integer('sort_order')->default(0);
                $table->string('status', 20)->default('ACTIVE');
                $table->timestamps();
            });

            // Seed initial categories
            DB::table('cottage_categories')->insertOrIgnore([
                [
                    'id' => 'cat_farm_cottages',
                    'name' => 'Farm Cottages',
                    'slug' => 'farm-cottages',
                    'description' => 'Charming holiday cottages at Home Farm. Group bookings welcome (multiple cottages can be selected).',
                    'allow_multiple' => 1,
                    'sort_order' => 1,
                    'status' => 'ACTIVE',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
                [
                    'id' => 'cat_estate_collection',
                    'name' => 'The Estate Collection',
                    'slug' => 'the-estate-collection',
                    'description' => 'Exclusive estate properties and private retreats. Individual bookings only (single cottage selection).',
                    'allow_multiple' => 0,
                    'sort_order' => 2,
                    'status' => 'ACTIVE',
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ]);
        }

        if (Schema::hasTable('cottages') && !Schema::hasColumn('cottages', 'category_id')) {
            Schema::table('cottages', function (Blueprint $table) {
                $table->string('category_id', 36)->nullable()->default('cat_farm_cottages')->after('property_id');
            });

            // Sync existing cottages: if home_section is section_2, set to cat_estate_collection
            DB::table('cottages')
                ->where('home_section', 'section_2')
                ->update(['category_id' => 'cat_estate_collection']);
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('cottages') && Schema::hasColumn('cottages', 'category_id')) {
            Schema::table('cottages', function (Blueprint $table) {
                $table->dropColumn('category_id');
            });
        }

        Schema::dropIfExists('cottage_categories');
    }
};
