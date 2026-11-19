<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. booking_items indexes for fast date-range lookups
        if (Schema::hasTable('booking_items')) {
            Schema::table('booking_items', function (Blueprint $table) {
                try {
                    $table->index(['room_type_id', 'check_in', 'check_out'], 'idx_bi_rt_dates');
                } catch (\Throwable) {}
                try {
                    $table->index(['check_in', 'check_out'], 'idx_bi_dates');
                } catch (\Throwable) {}
            });
        }

        // 2. availability_blocks index for fast date-range lookups
        if (Schema::hasTable('availability_blocks')) {
            Schema::table('availability_blocks', function (Blueprint $table) {
                try {
                    $table->index(['start_date', 'end_date'], 'idx_ab_dates');
                } catch (\Throwable) {}
            });
        }

        // 3. bookings index for active booking status joins
        if (Schema::hasTable('bookings')) {
            Schema::table('bookings', function (Blueprint $table) {
                try {
                    $table->index(['status', 'id'], 'idx_b_status_id');
                } catch (\Throwable) {}
            });
        }

        // 4. cottages/room_types index for active cottage lookups
        if (Schema::hasTable('cottages')) {
            Schema::table('cottages', function (Blueprint $table) {
                try {
                    $table->index(['status', 'slug'], 'idx_rt_status_slug');
                } catch (\Throwable) {}
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('booking_items')) {
            Schema::table('booking_items', function (Blueprint $table) {
                try { $table->dropIndex('idx_bi_rt_dates'); } catch (\Throwable) {}
                try { $table->dropIndex('idx_bi_dates'); } catch (\Throwable) {}
            });
        }
        if (Schema::hasTable('availability_blocks')) {
            Schema::table('availability_blocks', function (Blueprint $table) {
                try { $table->dropIndex('idx_ab_dates'); } catch (\Throwable) {}
            });
        }
        if (Schema::hasTable('bookings')) {
            Schema::table('bookings', function (Blueprint $table) {
                try { $table->dropIndex('idx_b_status_id'); } catch (\Throwable) {}
            });
        }
        if (Schema::hasTable('cottages')) {
            Schema::table('cottages', function (Blueprint $table) {
                try { $table->dropIndex('idx_rt_status_slug'); } catch (\Throwable) {}
            });
        }
    }
};
