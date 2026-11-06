<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class DatabaseBridgeService
{
    /**
     * Bridges Prisma camelCase tables and columns to Laravel snake_case schema.
     */
    public static function syncAll(): array
    {
        $log = [];

        // 1. Sync columns for shared tables
        $log['users'] = self::syncTableColumns('users', [
            'passwordHash' => 'password_hash VARCHAR(255) NULL',
            'isActive' => 'is_active TINYINT(1) DEFAULT 1',
            'createdAt' => 'created_at DATETIME(3) NULL',
            'updatedAt' => 'updated_at DATETIME(3) NULL',
            'lastLoginAt' => 'last_login_at DATETIME(3) NULL',
            'passwordResetTokenHash' => 'password_reset_token_hash VARCHAR(255) NULL',
            'passwordResetExpires' => 'password_reset_expires DATETIME(3) NULL',
        ]);

        $log['rooms'] = self::syncTableColumns('rooms', [
            'propertyId' => 'property_id CHAR(24) NULL',
            'roomTypeId' => 'room_type_id CHAR(24) NULL',
            'roomNumber' => 'room_number VARCHAR(20) NULL',
            'createdAt' => 'created_at DATETIME(3) NULL',
            'updatedAt' => 'updated_at DATETIME(3) NULL',
        ]);

        $log['bookings'] = self::syncTableColumns('bookings', [
            'bookingNumber' => 'booking_number VARCHAR(32) NULL',
            'propertyId' => 'property_id CHAR(24) NULL',
            'userId' => 'user_id CHAR(24) NULL',
            'paymentStatus' => 'payment_status VARCHAR(20) NULL',
            'checkIn' => 'check_in DATETIME(3) NULL',
            'checkOut' => 'check_out DATETIME(3) NULL',
            'reminderSent' => 'reminder_sent TINYINT(1) DEFAULT 0',
            'createdAt' => 'created_at DATETIME(3) NULL',
            'updatedAt' => 'updated_at DATETIME(3) NULL',
        ]);

        $log['payments'] = self::syncTableColumns('payments', [
            'bookingId' => 'booking_id CHAR(24) NULL',
            'propertyId' => 'property_id CHAR(24) NULL',
            'userId' => 'user_id CHAR(24) NULL',
            'paymentMethod' => 'payment_method VARCHAR(20) NULL',
            'idempotencyKey' => 'idempotency_key VARCHAR(120) NULL',
            'gatewayTransactionId' => 'gateway_transaction_id VARCHAR(120) NULL',
            'paymentIntentId' => 'payment_intent_id VARCHAR(120) NULL',
            'rawPayload' => 'raw_payload JSON NULL',
            'errorMessage' => 'error_message TEXT NULL',
            'paidAt' => 'paid_at DATETIME(3) NULL',
            'createdAt' => 'created_at DATETIME(3) NULL',
            'updatedAt' => 'updated_at DATETIME(3) NULL',
        ]);

        $log['refunds'] = self::syncTableColumns('refunds', [
            'paymentId' => 'payment_id CHAR(24) NULL',
            'bookingId' => 'booking_id CHAR(24) NULL',
            'refundAmount' => 'refund_amount INT NULL',
            'gatewayRefundId' => 'gateway_refund_id VARCHAR(120) NULL',
            'requestedBy' => 'requested_by CHAR(24) NULL',
            'processedAt' => 'processed_at DATETIME(3) NULL',
            'createdAt' => 'created_at DATETIME(3) NULL',
            'updatedAt' => 'updated_at DATETIME(3) NULL',
        ]);

        $log['coupons'] = self::syncTableColumns('coupons', [
            'discountType' => 'discount_type VARCHAR(20) NULL',
            'discountValue' => 'discount_value INT NULL',
            'minSpend' => 'min_spend INT NULL',
            'maxDiscount' => 'max_discount INT NULL',
            'startDate' => 'start_date DATETIME(3) NULL',
            'endDate' => 'end_date DATETIME(3) NULL',
            'usageLimit' => 'usage_limit INT NULL',
            'usageCount' => 'usage_count INT DEFAULT 0',
            'isActive' => 'is_active TINYINT(1) DEFAULT 1',
            'createdAt' => 'created_at DATETIME(3) NULL',
            'updatedAt' => 'updated_at DATETIME(3) NULL',
        ]);

        $log['properties'] = self::syncTableColumns('properties', [
            'mapEmbedUrl' => 'map_embed_url VARCHAR(1000) NULL',
            'checkInTime' => 'check_in_time VARCHAR(10) NULL',
            'checkOutTime' => 'check_out_time VARCHAR(10) NULL',
            'createdAt' => 'created_at DATETIME(3) NULL',
            'updatedAt' => 'updated_at DATETIME(3) NULL',
        ]);

        $log['media'] = self::syncTableColumns('media', [
            'storageProvider' => 'storage_provider VARCHAR(20) NULL',
            'fileId' => 'file_id VARCHAR(255) NULL',
            'originalFilename' => 'original_filename VARCHAR(255) NULL',
            'mimeType' => 'mime_type VARCHAR(100) NULL',
            'sizeBytes' => 'size_bytes BIGINT NULL',
            'thumbnailUrl' => 'thumbnail_url VARCHAR(500) NULL',
            'thumbnailFileId' => 'thumbnail_file_id VARCHAR(255) NULL',
            'uploadedBy' => 'uploaded_by CHAR(24) NULL',
            'createdAt' => 'created_at DATETIME(3) NULL',
            'updatedAt' => 'updated_at DATETIME(3) NULL',
        ]);

        $log['amenities'] = self::syncTableColumns('amenities', [
            'imageMediaId' => 'image_media_id CHAR(24) NULL',
            'iconUrl' => 'icon_url VARCHAR(500) NULL',
            'sortOrder' => 'sort_order INT DEFAULT 0',
            'createdAt' => 'created_at DATETIME(3) NULL',
            'updatedAt' => 'updated_at DATETIME(3) NULL',
        ]);

        // 2. Copy data from un-underscored Prisma tables to Laravel tables if target has 0 rows
        $log['copy_room_types'] = self::copyTableData('roomtypes', 'room_types', [
            'propertyId' => 'property_id',
            'shortDescription' => 'short_description',
            'maxAdults' => 'max_adults',
            'maxChildren' => 'max_children',
            'maxOccupancy' => 'max_occupancy',
            'propertyDetailsHtml' => 'property_details_html',
            'layoutHtml' => 'layout_html',
            'floorplanMediaIds' => 'floorplan_media_ids',
            'locationText' => 'location_text',
            'surroundingsHtml' => 'surroundings_html',
            'mapLat' => 'map_lat',
            'mapLng' => 'map_lng',
            'mapEmbedUrl' => 'map_embed_url',
            'welcomeHamperIncluded' => 'welcome_hamper_included',
            'welcomeHamperDescription' => 'welcome_hamper_description',
            'welcomeHamperImageMediaId' => 'welcome_hamper_image_media_id',
            'welcomeHamperHtml' => 'welcome_hamper_html',
            'amenityIds' => 'amenity_ids',
            'nearbyAttractions' => 'nearby_attractions',
            'maxDogs' => 'max_dogs',
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        $log['copy_site_settings'] = self::copyTableData('sitesettings', 'site_settings', [
            'propertyName' => 'property_name',
            'logoMediaId' => 'logo_media_id',
            'faviconMediaId' => 'favicon_media_id',
            'supportEmail' => 'support_email',
            'checkInTime' => 'check_in_time',
            'checkOutTime' => 'check_out_time',
            'reminderHoursBefore' => 'reminder_hours_before',
            'defaultSeo' => 'default_seo',
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        $log['copy_cancellation_policies'] = self::copyTableData('cancellationpolicies', 'cancellation_policies', [
            'propertyId' => 'property_id',
            'freeCancellationHours' => 'free_cancellation_hours',
            'refundPercentage' => 'refund_percentage',
            'isDefault' => 'is_default',
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        $log['copy_rate_plans'] = self::copyTableData('rateplans', 'rate_plans', [
            'propertyId' => 'property_id',
            'roomTypeId' => 'room_type_id',
            'cancellationPolicyId' => 'cancellation_policy_id',
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        $log['copy_booking_items'] = self::copyTableData('bookingitems', 'booking_items', [
            'bookingId' => 'booking_id',
            'roomTypeId' => 'room_type_id',
            'roomId' => 'room_id',
            'ratePlanId' => 'rate_plan_id',
            'roomNameSnapshot' => 'room_name_snapshot',
            'roomNumberSnapshot' => 'room_number_snapshot',
            'ratePlanNameSnapshot' => 'rate_plan_name_snapshot',
            'checkIn' => 'check_in',
            'checkOut' => 'check_out',
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        $log['copy_cms_pages'] = self::copyTableData('cmspages', 'cms_pages', [
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        $log['copy_cms_blog_posts'] = self::copyTableData('cmsblogposts', 'cms_blog_posts', [
            'coverImageMediaId' => 'cover_image_media_id',
            'publishedAt' => 'published_at',
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        $log['copy_cms_faqs'] = self::copyTableData('cmsfaqs', 'cms_faqs', [
            'sortOrder' => 'sort_order',
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        $log['copy_cms_offers'] = self::copyTableData('cmsoffers', 'cms_offers', [
            'descriptionHtml' => 'description_html',
            'termsHtml' => 'terms_html',
            'ctaLabel' => 'cta_label',
            'ctaUrl' => 'cta_url',
            'imageMediaId' => 'image_media_id',
            'sortOrder' => 'sort_order',
            'validFrom' => 'valid_from',
            'validTo' => 'valid_to',
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        $log['copy_cms_policy_docs'] = self::copyTableData('cmspolicydocs', 'cms_policy_docs', [
            'contentHtml' => 'content_html',
            'effectiveDate' => 'effective_date',
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        $log['copy_email_templates'] = self::copyTableData('emailtemplates', 'email_templates', [
            'htmlBody' => 'html_body',
            'textBody' => 'text_body',
            'isEnabled' => 'is_enabled',
            'updatedBy' => 'updated_by',
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        $log['copy_newsletter_subscribers'] = self::copyTableData('newslettersubscribers', 'newsletter_subscribers', [
            'normalizedEmail' => 'normalized_email',
            'unsubscribeToken' => 'unsubscribe_token',
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        $log['copy_audit_logs'] = self::copyTableData('auditlogs', 'audit_logs', [
            'actorId' => 'actor_id',
            'actorRole' => 'actor_role',
            'entityType' => 'entity_type',
            'entityId' => 'entity_id',
            'userAgent' => 'user_agent',
            'createdAt' => 'created_at',
        ]);

        $log['copy_webhook_events'] = self::copyTableData('webhookevents', 'webhook_events', [
            'stripeEventId' => 'stripe_event_id',
            'eventType' => 'event_type',
            'receivedAt' => 'received_at',
            'processedAt' => 'processed_at',
            'processingStatus' => 'processing_status',
            'createdAt' => 'created_at',
            'updatedAt' => 'updated_at',
        ]);

        // 3. Relax NOT NULL constraints on Prisma legacy columns across ALL tables
        try {
            $dbName = DB::connection()->getDatabaseName();
            $tables = DB::select('SHOW TABLES');
            $keyName = "Tables_in_" . $dbName;
            $relaxedCount = 0;

            foreach ($tables as $t) {
                $tableName = $t->$keyName;
                if (Schema::hasColumn($tableName, 'createdAt')) {
                    try {
                        DB::statement("ALTER TABLE `{$tableName}` MODIFY COLUMN `createdAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3)");
                        $relaxedCount++;
                    } catch (\Throwable $e) {}
                }
                if (Schema::hasColumn($tableName, 'updatedAt')) {
                    try {
                        DB::statement("ALTER TABLE `{$tableName}` MODIFY COLUMN `updatedAt` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)");
                        $relaxedCount++;
                    } catch (\Throwable $e) {}
                }
                if (Schema::hasColumn($tableName, 'created_at')) {
                    try {
                        DB::statement("ALTER TABLE `{$tableName}` MODIFY COLUMN `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3)");
                        $relaxedCount++;
                    } catch (\Throwable $e) {}
                }
                if (Schema::hasColumn($tableName, 'updated_at')) {
                    try {
                        DB::statement("ALTER TABLE `{$tableName}` MODIFY COLUMN `updated_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)");
                        $relaxedCount++;
                    } catch (\Throwable $e) {}
                }
            }
            $log['relaxed_columns'] = "Relaxed constraints on {$relaxedCount} timestamp columns across tables";
        } catch (\Throwable $e) {
            $log['relaxed_columns_error'] = $e->getMessage();
        }

        // Specific relaxation for users table
        if (Schema::hasTable('users')) {
            try {
                if (Schema::hasColumn('users', 'passwordHash')) {
                    DB::statement("ALTER TABLE `users` MODIFY COLUMN `passwordHash` VARCHAR(255) NULL");
                }
                if (Schema::hasColumn('users', 'password_hash')) {
                    DB::statement("ALTER TABLE `users` MODIFY COLUMN `password_hash` VARCHAR(255) NULL");
                }
                if (Schema::hasColumn('users', 'isActive')) {
                    DB::statement("ALTER TABLE `users` MODIFY COLUMN `isActive` TINYINT(1) NULL DEFAULT 1");
                }
                if (Schema::hasColumn('users', 'is_active')) {
                    DB::statement("ALTER TABLE `users` MODIFY COLUMN `is_active` TINYINT(1) NULL DEFAULT 1");
                }
            } catch (\Throwable $e) {
                // Ignore
            }
        }

        // 4. Ensure admin user is seeded with correct hash in both columns
        $hash = Hash::make('admin@gmail.com');
        $now = now();
        $admin = DB::table('users')->where('email', 'admin@gmail.com')->first();
        if ($admin) {
            $update = [
                'role' => 'admin',
            ];
            if (Schema::hasColumn('users', 'password_hash')) {
                $update['password_hash'] = $hash;
            }
            if (Schema::hasColumn('users', 'passwordHash')) {
                $update['passwordHash'] = $hash;
            }
            if (Schema::hasColumn('users', 'is_active')) {
                $update['is_active'] = 1;
            }
            if (Schema::hasColumn('users', 'isActive')) {
                $update['isActive'] = 1;
            }
            if (Schema::hasColumn('users', 'updated_at')) {
                $update['updated_at'] = $now;
            }
            if (Schema::hasColumn('users', 'updatedAt')) {
                $update['updatedAt'] = $now;
            }
            DB::table('users')->where('email', 'admin@gmail.com')->update($update);
            $log['admin_status'] = 'admin@gmail.com updated with password admin@gmail.com';
        } else {
            $insert = [
                'id' => '6ac0cc40a287cfd3dfbbf8a8',
                'name' => 'Administrator',
                'email' => 'admin@gmail.com',
                'role' => 'admin',
            ];
            if (Schema::hasColumn('users', 'password_hash')) {
                $insert['password_hash'] = $hash;
            }
            if (Schema::hasColumn('users', 'passwordHash')) {
                $insert['passwordHash'] = $hash;
            }
            if (Schema::hasColumn('users', 'is_active')) {
                $insert['is_active'] = 1;
            }
            if (Schema::hasColumn('users', 'isActive')) {
                $insert['isActive'] = 1;
            }
            if (Schema::hasColumn('users', 'created_at')) {
                $insert['created_at'] = $now;
            }
            if (Schema::hasColumn('users', 'createdAt')) {
                $insert['createdAt'] = $now;
            }
            if (Schema::hasColumn('users', 'updated_at')) {
                $insert['updated_at'] = $now;
            }
            if (Schema::hasColumn('users', 'updatedAt')) {
                $insert['updatedAt'] = $now;
            }
            DB::table('users')->insert($insert);
            $log['admin_status'] = 'admin@gmail.com created with password admin@gmail.com';
        }

        return $log;
    }

    private static function syncTableColumns(string $table, array $columnMap): string
    {
        if (! Schema::hasTable($table)) {
            return "table {$table} does not exist";
        }

        $added = 0;
        foreach ($columnMap as $sourceCol => $def) {
            $targetCol = explode(' ', $def)[0];
            if (! Schema::hasColumn($table, $targetCol)) {
                try {
                    DB::statement("ALTER TABLE `{$table}` ADD COLUMN `{$targetCol}` " . substr($def, strlen($targetCol) + 1));
                    $added++;
                } catch (\Throwable $e) {
                    Log::warning("Could not add {$targetCol} to {$table}: " . $e->getMessage());
                }
            }

            if (Schema::hasColumn($table, $sourceCol) && Schema::hasColumn($table, $targetCol)) {
                try {
                    DB::statement("UPDATE `{$table}` SET `{$targetCol}` = `{$sourceCol}` WHERE `{$targetCol}` IS NULL AND `{$sourceCol}` IS NOT NULL");
                } catch (\Throwable $e) {
                    // Ignore
                }
            }
        }

        return "added {$added} columns to {$table}";
    }

    private static function copyTableData(string $sourceTable, string $targetTable, array $columnRenames): string
    {
        if (! Schema::hasTable($sourceTable) || ! Schema::hasTable($targetTable)) {
            return "skipped: source or target missing ({$sourceTable} -> {$targetTable})";
        }

        $targetCount = DB::table($targetTable)->count();
        if ($targetCount > 0) {
            return "skipped: {$targetTable} already has {$targetCount} rows";
        }

        $sourceCount = DB::table($sourceTable)->count();
        if ($sourceCount === 0) {
            return "skipped: {$sourceTable} is empty";
        }

        $rows = DB::table($sourceTable)->get();
        $inserted = 0;

        foreach ($rows as $row) {
            $data = (array) $row;
            $transformed = [];

            foreach ($data as $col => $val) {
                $targetCol = $columnRenames[$col] ?? $col;
                if (Schema::hasColumn($targetTable, $targetCol)) {
                    $transformed[$targetCol] = $val;
                }
            }

            if (! empty($transformed)) {
                try {
                    DB::table($targetTable)->insert($transformed);
                    $inserted++;
                } catch (\Throwable $e) {
                    Log::warning("Copy row error ({$sourceTable} -> {$targetTable}): " . $e->getMessage());
                }
            }
        }

        return "copied {$inserted} of {$sourceCount} rows from {$sourceTable} to {$targetTable}";
    }
}

