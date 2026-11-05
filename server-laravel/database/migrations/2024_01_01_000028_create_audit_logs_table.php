<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->char('actor_id', 24)->nullable();
            $table->string('actor_role', 40)->nullable();
            $table->string('action', 60);
            $table->string('entity_type', 60);
            $table->string('entity_id', 60)->nullable();
            $table->json('before')->nullable();
            $table->json('after')->nullable();
            $table->json('metadata')->nullable();
            $table->string('ip', 60)->nullable();
            $table->string('user_agent', 300)->nullable();
            $table->timestamps(3);

            $table->index(['created_at']);
            $table->index(['entity_type', 'entity_id', 'created_at']);
            $table->index(['action', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
