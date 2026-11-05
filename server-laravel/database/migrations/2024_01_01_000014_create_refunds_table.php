<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('refunds', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->char('booking_id', 24);
            $table->char('payment_id', 24);
            $table->string('provider', 20)->default('STRIPE');
            $table->string('provider_refund_id', 120)->unique();
            $table->decimal('amount', 12, 2);
            $table->string('currency', 10);
            $table->string('status', 20)->default('SUCCEEDED');
            $table->text('reason')->nullable();
            $table->char('requested_by', 24)->nullable();
            $table->datetime('processed_at', 3)->nullable();
            $table->timestamps(3);

            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
            $table->foreign('payment_id')->references('id')->on('payments')->onDelete('cascade');
            $table->foreign('requested_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['booking_id', 'created_at']);
            $table->index(['payment_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
