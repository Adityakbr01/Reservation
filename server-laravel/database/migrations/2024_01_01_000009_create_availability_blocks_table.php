<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('availability_blocks', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->char('property_id', 24);
            $table->char('room_id', 24);
            $table->datetime('start_date', 3);
            $table->datetime('end_date', 3);
            $table->string('reason', 300)->nullable();
            $table->char('created_by', 24)->nullable();
            $table->timestamps(3);

            $table->foreign('property_id')->references('id')->on('properties')->onDelete('cascade');
            $table->foreign('room_id')->references('id')->on('rooms')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->index(['room_id', 'start_date', 'end_date']);
            $table->index(['property_id', 'start_date', 'end_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('availability_blocks');
    }
};
