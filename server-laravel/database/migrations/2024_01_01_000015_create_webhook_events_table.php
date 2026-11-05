<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('webhook_events', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->string('provider', 20)->default('STRIPE');
            $table->string('stripe_event_id', 120)->unique();
            $table->string('event_type', 100);
            $table->datetime('received_at', 3);
            $table->datetime('processed_at', 3)->nullable();
            $table->string('processing_status', 20)->default('RECEIVED');
            $table->timestamps(3);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('webhook_events');
    }
};
