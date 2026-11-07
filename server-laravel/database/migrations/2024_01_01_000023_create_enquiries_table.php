<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('enquiries', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->string('title', 20)->nullable();
            $table->string('first_name', 80);
            $table->string('last_name', 80);
            $table->string('email', 160);
            $table->string('telephone', 40);
            $table->string('holiday_budget', 60)->nullable();
            $table->integer('party_size')->nullable();
            $table->integer('bedrooms')->nullable();
            $table->string('from_date', 30)->nullable();
            $table->string('to_date', 30)->nullable();
            $table->string('specific_location', 200)->nullable();
            $table->boolean('dog_friendly')->nullable();
            $table->text('details')->nullable();
            $table->char('room_type_id', 24)->nullable();
            $table->string('status', 20)->default('NEW');
            $table->timestamps(3);

            $table->foreign('room_type_id')->references('id')->on('cottages')->onDelete('set null');
            $table->index(['status', 'created_at']);
            $table->index(['email', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('enquiries');
    }
};
