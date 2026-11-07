<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cottages', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->char('property_id', 24);
            $table->string('name', 120);
            $table->string('slug', 140);
            $table->text('short_description')->nullable();
            $table->mediumText('description')->nullable();
            $table->integer('max_adults')->default(2);
            $table->integer('max_children')->default(0);
            $table->integer('max_occupancy')->default(2);
            $table->json('beds')->nullable();
            $table->json('amenities')->nullable();
            $table->json('images')->nullable();
            $table->json('media')->nullable();
            $table->mediumText('property_details_html')->nullable();
            $table->mediumText('layout_html')->nullable();
            $table->json('floorplan_media_ids')->nullable();
            $table->text('location_text')->nullable();
            $table->mediumText('surroundings_html')->nullable();
            $table->text('map_embed_url')->nullable();
            $table->float('map_lat')->nullable();
            $table->float('map_lng')->nullable();
            $table->boolean('welcome_hamper_included')->default(false);
            $table->text('welcome_hamper_description')->nullable();
            $table->char('welcome_hamper_image_media_id', 24)->nullable();
            $table->mediumText('welcome_hamper_html')->nullable();
            $table->json('amenity_ids')->nullable();
            $table->json('nearby_attractions')->nullable();
            $table->integer('bedrooms')->nullable();
            $table->integer('bathrooms')->nullable();
            $table->integer('max_dogs')->nullable()->default(0);
            $table->string('status', 20)->default('ACTIVE');
            $table->json('seo')->nullable();
            $table->timestamps(3);

            $table->foreign('property_id')->references('id')->on('properties')->onDelete('cascade');
            $table->unique(['property_id', 'slug']);
            $table->index(['property_id', 'status']);
        });

        // Compatibility view for any queries referencing room_types
        try {
            DB::statement('CREATE OR REPLACE VIEW room_types AS SELECT * FROM cottages');
        } catch (\Throwable) {
            // View creation optional if restricted
        }
    }

    public function down(): void
    {
        try {
            DB::statement('DROP VIEW IF EXISTS room_types');
        } catch (\Throwable) {
        }
        Schema::dropIfExists('cottages');
    }
};
