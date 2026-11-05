<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notifications', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->string('type', 60);
            $table->string('recipient', 160);
            $table->char('booking_id', 24)->nullable();
            $table->char('payment_id', 24)->nullable();
            $table->string('idempotency_key', 120)->unique();
            $table->string('status', 20)->default('QUEUED');
            $table->integer('attempts')->default(0);
            $table->integer('max_attempts')->default(5);
            $table->datetime('next_attempt_at', 3)->nullable();
            $table->text('last_error')->nullable();
            $table->string('provider', 40)->nullable();
            $table->string('provider_message_id', 120)->nullable();
            $table->datetime('sent_at', 3)->nullable();
            $table->timestamps(3);

            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('set null');
            $table->foreign('payment_id')->references('id')->on('payments')->onDelete('set null');
            $table->index(['status', 'next_attempt_at']);
            $table->index(['booking_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
