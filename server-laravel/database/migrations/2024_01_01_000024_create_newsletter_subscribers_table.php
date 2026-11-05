<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('newsletter_subscribers', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->string('email', 160);
            $table->string('normalized_email', 160)->unique();
            $table->string('name', 120)->nullable();
            $table->string('source', 40)->nullable();
            $table->string('status', 20)->default('SUBSCRIBED');
            $table->string('unsubscribe_token', 64);
            $table->timestamps(3);

            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('newsletter_subscribers');
    }
};
