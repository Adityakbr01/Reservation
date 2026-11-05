<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('media', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->string('file_name', 255);
            $table->string('url', 500);
            $table->string('storage_key', 255)->unique();
            $table->string('storage_provider', 20)->default('ftp');
            $table->string('legacy_url', 500)->nullable();
            $table->string('legacy_storage_key', 255)->nullable();
            $table->string('mime', 100);
            $table->string('kind', 20)->default('image');
            $table->string('folder', 200)->nullable();
            $table->integer('width')->nullable();
            $table->integer('height')->nullable();
            $table->float('duration_sec')->nullable();
            $table->string('alt', 200)->nullable();
            $table->string('caption', 300)->nullable();
            $table->integer('size');
            $table->integer('position')->default(0);
            $table->char('created_by', 24)->nullable();
            $table->timestamps(3);

            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['created_at']);
            $table->index(['folder', 'created_at']);
            $table->index(['folder', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('media');
    }
};
