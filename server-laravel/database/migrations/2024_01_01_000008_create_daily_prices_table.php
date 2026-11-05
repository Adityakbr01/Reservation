<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_prices', function (Blueprint $table) {
            $table->char('id', 36)->primary();
            $table->char('rate_plan_id', 24);
            $table->char('property_id', 24);
            $table->date('date');
            $table->integer('price');
            $table->string('currency', 3)->default('GBP');
            $table->timestamps(3);

            $table->foreign('rate_plan_id')->references('id')->on('rate_plans')->onDelete('cascade');
            $table->foreign('property_id')->references('id')->on('properties')->onDelete('cascade');
            $table->unique(['rate_plan_id', 'date']);
            $table->index(['property_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_prices');
    }
};
