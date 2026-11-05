<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_blog_posts', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->string('title', 160);
            $table->string('slug', 140)->unique();
            $table->string('excerpt', 300)->nullable();
            $table->longText('content');
            $table->char('featured_image_media_id', 24)->nullable();
            $table->string('author', 120)->nullable();
            $table->string('category', 80)->nullable();
            $table->json('tags')->nullable();
            $table->integer('reading_minutes')->default(1);
            $table->json('seo')->nullable();
            $table->string('status', 20)->default('DRAFT');
            $table->integer('version')->default(1);
            $table->datetime('published_at', 3)->nullable();
            $table->char('created_by', 24)->nullable();
            $table->string('preview_token', 100)->nullable();
            $table->datetime('preview_expires_at', 3)->nullable();
            $table->timestamps(3);

            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['status', 'slug']);
            $table->index(['status', 'category', 'created_at']);
            $table->index(['preview_token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_blog_posts');
    }
};
