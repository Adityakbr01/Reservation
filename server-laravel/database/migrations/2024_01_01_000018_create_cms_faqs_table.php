<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cms_faqs', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->string('question', 300);
            $table->mediumText('answer');
            $table->string('category', 80)->nullable();
            $table->integer('sort_order')->default(0);
            $table->string('status', 20)->default('DRAFT');
            $table->integer('version')->default(1);
            $table->datetime('published_at', 3)->nullable();
            $table->char('created_by', 24)->nullable();
            $table->string('preview_token', 100)->nullable();
            $table->datetime('preview_expires_at', 3)->nullable();
            $table->timestamps(3);

            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['status', 'category', 'sort_order']);
            $table->index(['preview_token']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cms_faqs');
    }
};
