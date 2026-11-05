<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('properties', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->text('description')->nullable();
            $table->json('contact')->nullable();
            $table->string('map_embed_url', 1000)->nullable();
            $table->string('check_in_time', 10)->default('14:00');
            $table->string('check_out_time', 10)->default('12:00');
            $table->string('timezone', 60)->default('Asia/Kolkata');
            $table->string('currency', 10)->default('INR');
            $table->string('status', 20)->default('ACTIVE');
            $table->timestamps(3);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('properties');
    }
};
