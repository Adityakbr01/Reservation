<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->char('room_type_id', 24)->nullable();
            $table->char('user_id', 24)->nullable();
            $table->char('booking_id', 24)->nullable();
            $table->string('author_name', 120);
            $table->integer('rating');
            $table->string('title', 160)->nullable();
            $table->text('body');
            $table->string('stay_date', 30)->nullable();
            $table->boolean('is_verified')->default(false);
            $table->boolean('is_admin_created')->default(false);
            $table->string('status', 20)->default('PENDING');
            $table->timestamps(3);

            $table->foreign('room_type_id')->references('id')->on('room_types')->onDelete('set null');
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
            $table->foreign('booking_id')->references('id')->on('bookings')->onDelete('set null');
            $table->index(['room_type_id', 'status', 'created_at']);
            $table->index(['booking_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
