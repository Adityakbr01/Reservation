<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->char('property_id', 24);
            $table->string('code', 40);
            $table->string('normalized_code', 40);
            $table->string('discount_type', 20);
            $table->decimal('discount_value', 12, 2);
            $table->decimal('max_discount', 12, 2)->nullable();
            $table->decimal('minimum_booking_amount', 12, 2)->nullable();
            $table->datetime('valid_from', 3)->nullable();
            $table->datetime('valid_until', 3)->nullable();
            $table->integer('usage_limit')->nullable();
            $table->integer('usage_count')->default(0);
            $table->integer('per_user_limit')->nullable();
            $table->json('applicable_room_type_ids')->nullable();
            $table->string('status', 20)->default('ACTIVE');
            $table->char('created_by', 24)->nullable();
            $table->timestamps(3);

            $table->foreign('property_id')->references('id')->on('properties')->onDelete('cascade');
            $table->foreign('created_by')->references('id')->on('users')->onDelete('set null');
            $table->unique(['property_id', 'normalized_code']);
            $table->index(['property_id', 'status', 'valid_from', 'valid_until']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};
