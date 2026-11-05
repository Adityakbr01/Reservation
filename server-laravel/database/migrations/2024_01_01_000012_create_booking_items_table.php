<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_items', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->char('booking_id', 24);
            $table->char('room_type_id', 24)->nullable();
            $table->char('room_id', 24)->nullable();
            $table->char('rate_plan_id', 24)->nullable();
            $table->string('room_name_snapshot', 120);
            $table->string('room_number_snapshot', 20)->nullable();
            $table->string('rate_plan_name_snapshot', 120);
            $table->datetime('check_in', 3);
            $table->datetime('check_out', 3);
            $table->json('guests');
            $table->json('pricing');
            $table->timestamps(3);

            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('cascade');
            $table->foreign('room_type_id')->references('id')->on('room_types')->onDelete('set null');
            $table->foreign('room_id')->references('id')->on('rooms')->onDelete('set null');
            $table->foreign('rate_plan_id')->references('id')->on('rate_plans')->onDelete('set null');
            $table->index(['booking_id']);
            $table->index(['room_id', 'check_in', 'check_out']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('booking_items');
    }
};
