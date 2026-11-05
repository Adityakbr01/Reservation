<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->char('booking_id', 24);
            $table->char('user_id', 24)->nullable();
            $table->string('provider', 20)->default('STRIPE');
            $table->string('provider_payment_intent_id', 120)->unique()->nullable();
            $table->string('provider_checkout_session_id', 120)->nullable();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 10);
            $table->string('status', 20)->default('PENDING');
            $table->string('failure_code', 100)->nullable();
            $table->text('failure_message')->nullable();
            $table->datetime('paid_at', 3)->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps(3);

            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->index(['booking_id']);
            $table->index(['status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
