<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rooms', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->char('property_id', 24);
            $table->char('room_type_id', 24);
            $table->string('name', 80);
            $table->string('room_number', 20);
            $table->string('floor', 20)->nullable();
            $table->string('status', 20)->default('ACTIVE');
            $table->string('condition', 1000)->nullable();
            $table->text('notes')->nullable();
            $table->timestamps(3);

            $table->foreign('property_id')->references('id')->on('properties')->onDelete('cascade');
            $table->foreign('room_type_id')->references('id')->on('cottages')->onDelete('cascade');
            $table->unique(['property_id', 'room_number']);
            $table->index(['property_id', 'room_type_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
