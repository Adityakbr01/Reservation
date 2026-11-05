<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cancellation_policies', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->char('property_id', 24);
            $table->string('name', 120);
            $table->integer('free_cancellation_hours');
            $table->decimal('refund_percentage', 5, 2);
            $table->boolean('is_default')->default(false);
            $table->timestamps(3);

            $table->foreign('property_id')->references('id')->on('properties')->onDelete('cascade');
            $table->index(['property_id', 'is_default']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cancellation_policies');
    }
};
