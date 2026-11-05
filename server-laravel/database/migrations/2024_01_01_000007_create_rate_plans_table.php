<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('rate_plans', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->char('property_id', 24);
            $table->char('room_type_id', 24);
            $table->string('name', 120);
            $table->string('slug', 140);
            $table->text('description')->nullable();
            $table->json('pricing');
            $table->json('restrictions');
            $table->char('cancellation_policy_id', 24)->nullable();
            $table->string('status', 20)->default('DRAFT');
            $table->timestamps(3);

            $table->foreign('property_id')->references('id')->on('properties')->onDelete('cascade');
            $table->foreign('room_type_id')->references('id')->on('room_types')->onDelete('cascade');
            $table->foreign('cancellation_policy_id')->references('id')->on('cancellation_policies')->onDelete('set null');
            $table->unique(['property_id', 'slug']);
            $table->index(['property_id', 'room_type_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rate_plans');
    }
};
