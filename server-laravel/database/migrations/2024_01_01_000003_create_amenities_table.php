<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('amenities', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->string('group', 30)->default('HIGHLIGHT');
            $table->text('description')->nullable();
            $table->char('image_media_id', 24)->nullable();
            $table->string('icon_url', 500)->nullable();
            $table->integer('sort_order')->default(0);
            $table->string('status', 20)->default('ACTIVE');
            $table->timestamps(3);

            $table->index(['group', 'status', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('amenities');
    }
};
