<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bookings', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->string('booking_number', 32)->unique();
            $table->char('property_id', 24);
            $table->char('user_id', 24)->nullable();
            $table->string('status', 20)->default('HELD');
            $table->string('payment_status', 20)->default('PENDING');
            $table->datetime('check_in', 3);
            $table->datetime('check_out', 3);
            $table->json('guests');
            $table->json('contact');
            $table->json('pricing');
            $table->json('cancellation')->nullable();
            $table->json('hold')->nullable();
            $table->json('stay')->nullable();
            $table->string('source', 20)->default('DIRECT');
            $table->text('notes')->nullable();
            $table->boolean('reminder_sent')->default(false);
            $table->timestamps(3);

            $table->foreign('property_id')->references('id')->on('properties')->onDelete('cascade');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->index(['property_id', 'status', 'check_in']);
            $table->index(['property_id', 'check_out']);
            $table->index(['status', 'reminder_sent', 'check_in']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bookings');
    }
};
