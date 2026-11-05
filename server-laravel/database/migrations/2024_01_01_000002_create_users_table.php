<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->string('name', 80);
            $table->string('email', 160)->unique();
            $table->string('password_hash', 255);
            $table->string('role', 30)->default('user');
            $table->boolean('is_active')->default(true);
            $table->string('avatar_url', 500)->nullable();
            $table->string('avatar_file_id', 255)->nullable();
            $table->string('avatar_storage_provider', 20)->default('ftp');
            $table->string('legacy_avatar_url', 500)->nullable();
            $table->string('legacy_avatar_file_id', 255)->nullable();
            $table->string('password_reset_token_hash', 255)->nullable();
            $table->datetime('password_reset_expires', 3)->nullable();
            $table->datetime('last_login_at', 3)->nullable();
            $table->timestamps(3);

            $table->index(['password_reset_token_hash']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
