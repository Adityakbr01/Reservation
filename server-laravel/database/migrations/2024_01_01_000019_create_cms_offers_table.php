<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_offers', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->string('title', 160);
            $table->string('slug', 140)->unique();
            $table->mediumText('description');
            $table->char('image_media_id', 24)->nullable();
            $table->datetime('valid_from', 3)->nullable();
            $table->datetime('valid_until', 3)->nullable();
            $table->string('cta_label', 80)->nullable();
            $table->string('cta_url', 500)->nullable();
            $table->char('coupon_id', 24)->nullable();
            $table->json('seo')->nullable();
            $table->string('status', 20)->default('DRAFT');
            $table->integer('version')->default(1);
            $table->datetime('published_at', 3)->nullable();
            $table->char('created_by', 24)->nullable();
            $table->string('preview_token', 100)->nullable();
            $table->datetime('preview_expires_at', 3)->nullable();
            $table->timestamps(3);

            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->foreign('coupon_id')->references('id')->on('coupons')->onDelete('set null');
            $table->index(['status', 'slug']);
            $table->index(['preview_token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_offers');
    }
};
