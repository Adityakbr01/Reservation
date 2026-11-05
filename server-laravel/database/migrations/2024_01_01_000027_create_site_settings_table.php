<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('site_settings', function (Blueprint $table) {
            $table->char('id', 24)->primary();
            $table->string('key', 40)->unique()->default('site');
            $table->string('property_name', 120)->default('Reservation');
            $table->char('logo_media_id', 24)->nullable();
            $table->char('favicon_media_id', 24)->nullable();
            $table->string('phone', 40)->nullable();
            $table->string('support_email', 160)->nullable();
            $table->string('address', 300)->nullable();
            $table->string('timezone', 60)->default('Asia/Kolkata');
            $table->string('currency', 10)->default('INR');
            $table->string('check_in_time', 10)->nullable();
            $table->string('check_out_time', 10)->nullable();
            $table->integer('reminder_hours_before')->default(24);
            $table->json('social')->nullable();
            $table->json('default_seo')->nullable();
            $table->json('why_book_with_us')->nullable();
            $table->timestamps(3);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('site_settings');
    }
};
