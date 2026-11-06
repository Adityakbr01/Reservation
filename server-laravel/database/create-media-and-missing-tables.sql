-- ============================================================================
-- Hamptworth Stays - Ensure Media & All Missing Tables Exist
-- ============================================================================
-- Run this script in phpMyAdmin > SQL tab on your database (hamptworthstays).
-- It uses "CREATE TABLE IF NOT EXISTS" so it will NOT touch or overwrite any
-- tables you already have, but will create `media` and any other missing tables.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. MEDIA TABLE (fixes SQLSTATE[42S02]: Table 'hamptworthstays.media' doesn't exist)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `media` (
  `id` char(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `file_name` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `url` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `storage_provider` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'local',
  `legacy_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `legacy_storage_key` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mime` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `kind` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'image',
  `folder` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `duration_sec` double DEFAULT NULL,
  `alt` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `caption` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `size` int NOT NULL,
  `position` int NOT NULL DEFAULT 0,
  `created_by` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `media_storage_key_unique` (`storage_key`),
  KEY `media_created_at_index` (`created_at`),
  KEY `media_folder_created_at_index` (`folder`,`created_at`),
  KEY `media_folder_position_index` (`folder`,`position`),
  KEY `media_created_by_foreign` (`created_by`),
  CONSTRAINT `media_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. CMS PAGES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cms_pages` (
  `id` char(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(140) COLLATE utf8mb4_unicode_ci NOT NULL,
  `excerpt` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sections` json NOT NULL,
  `featured_image_media_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `seo` json DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `version` int NOT NULL DEFAULT 1,
  `published_at` datetime(3) DEFAULT NULL,
  `created_by` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preview_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preview_expires_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cms_pages_slug_unique` (`slug`),
  KEY `cms_pages_status_slug_index` (`status`,`slug`),
  KEY `cms_pages_preview_token_index` (`preview_token`),
  KEY `cms_pages_created_by_foreign` (`created_by`),
  CONSTRAINT `cms_pages_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. CMS BLOG POSTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cms_blog_posts` (
  `id` char(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(140) COLLATE utf8mb4_unicode_ci NOT NULL,
  `excerpt` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `content` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `featured_image_media_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `author` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `category` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `tags` json DEFAULT NULL,
  `reading_minutes` int NOT NULL DEFAULT 1,
  `seo` json DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `version` int NOT NULL DEFAULT 1,
  `published_at` datetime(3) DEFAULT NULL,
  `created_by` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preview_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preview_expires_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cms_blog_posts_slug_unique` (`slug`),
  KEY `cms_blog_posts_status_slug_index` (`status`,`slug`),
  KEY `cms_blog_posts_status_category_created_at_index` (`status`,`category`,`created_at`),
  KEY `cms_blog_posts_preview_token_index` (`preview_token`),
  KEY `cms_blog_posts_created_by_foreign` (`created_by`),
  CONSTRAINT `cms_blog_posts_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. CMS FAQS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cms_faqs` (
  `id` char(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `question` varchar(300) COLLATE utf8mb4_unicode_ci NOT NULL,
  `answer` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `category` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sort_order` int NOT NULL DEFAULT 0,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `version` int NOT NULL DEFAULT 1,
  `published_at` datetime(3) DEFAULT NULL,
  `created_by` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preview_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preview_expires_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `cms_faqs_status_category_sort_order_index` (`status`,`category`,`sort_order`),
  KEY `cms_faqs_preview_token_index` (`preview_token`),
  KEY `cms_faqs_created_by_foreign` (`created_by`),
  CONSTRAINT `cms_faqs_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. CMS OFFERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cms_offers` (
  `id` char(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `slug` varchar(140) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `image_media_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `valid_from` datetime(3) DEFAULT NULL,
  `valid_until` datetime(3) DEFAULT NULL,
  `cta_label` varchar(80) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cta_url` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `coupon_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `seo` json DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `version` int NOT NULL DEFAULT 1,
  `published_at` datetime(3) DEFAULT NULL,
  `created_by` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preview_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preview_expires_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cms_offers_slug_unique` (`slug`),
  KEY `cms_offers_status_slug_index` (`status`,`slug`),
  KEY `cms_offers_preview_token_index` (`preview_token`),
  KEY `cms_offers_created_by_foreign` (`created_by`),
  KEY `cms_offers_coupon_id_foreign` (`coupon_id`),
  CONSTRAINT `cms_offers_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `cms_offers_coupon_id_foreign` FOREIGN KEY (`coupon_id`) REFERENCES `coupons` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 6. CMS POLICY DOCS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `cms_policy_docs` (
  `id` char(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `body` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'DRAFT',
  `version` int NOT NULL DEFAULT 1,
  `published_at` datetime(3) DEFAULT NULL,
  `created_by` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preview_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `preview_expires_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `cms_policy_docs_key_unique` (`key`),
  KEY `cms_policy_docs_preview_token_index` (`preview_token`),
  KEY `cms_policy_docs_created_by_foreign` (`created_by`),
  CONSTRAINT `cms_policy_docs_created_by_foreign` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 7. EMAIL TEMPLATES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `email_templates` (
  `id` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `subject` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `html_body` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `text_body` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `is_enabled` tinyint(1) NOT NULL DEFAULT '1',
  `updated_by` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_templates_key_unique` (`key`),
  KEY `email_templates_updated_by_foreign` (`updated_by`),
  CONSTRAINT `email_templates_updated_by_foreign` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 8. ENQUIRIES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `enquiries` (
  `id` char(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `title` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `first_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(80) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telephone` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `holiday_budget` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `party_size` int DEFAULT NULL,
  `bedrooms` int DEFAULT NULL,
  `from_date` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `to_date` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `specific_location` varchar(200) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dog_friendly` tinyint(1) DEFAULT NULL,
  `details` text COLLATE utf8mb4_unicode_ci,
  `room_type_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'NEW',
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `enquiries_status_created_at_index` (`status`,`created_at`),
  KEY `enquiries_email_created_at_index` (`email`,`created_at`),
  KEY `enquiries_room_type_id_foreign` (`room_type_id`),
  CONSTRAINT `enquiries_room_type_id_foreign` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 9. NEWSLETTER SUBSCRIBERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `newsletter_subscribers` (
  `id` char(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `normalized_email` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `name` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `source` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'SUBSCRIBED',
  `unsubscribe_token` varchar(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `newsletter_subscribers_normalized_email_unique` (`normalized_email`),
  KEY `newsletter_subscribers_status_created_at_index` (`status`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 10. NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` char(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `recipient` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `booking_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idempotency_key` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'QUEUED',
  `attempts` int NOT NULL DEFAULT '0',
  `max_attempts` int NOT NULL DEFAULT '5',
  `next_attempt_at` datetime(3) DEFAULT NULL,
  `last_error` text COLLATE utf8mb4_unicode_ci,
  `provider` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `provider_message_id` varchar(120) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `sent_at` datetime(3) DEFAULT NULL,
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `notifications_idempotency_key_unique` (`idempotency_key`),
  KEY `notifications_status_next_attempt_at_index` (`status`,`next_attempt_at`),
  KEY `notifications_booking_id_created_at_index` (`booking_id`,`created_at`),
  KEY `notifications_payment_id_foreign` (`payment_id`),
  CONSTRAINT `notifications_booking_id_foreign` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `notifications_payment_id_foreign` FOREIGN KEY (`payment_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 11. REVIEWS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` char(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_type_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `booking_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `author_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL,
  `rating` int NOT NULL,
  `title` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `body` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `stay_date` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `is_verified` tinyint(1) NOT NULL DEFAULT '0',
  `is_admin_created` tinyint(1) NOT NULL DEFAULT '0',
  `status` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDING',
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `reviews_room_type_id_status_created_at_index` (`room_type_id`,`status`,`created_at`),
  KEY `reviews_booking_id_index` (`booking_id`),
  KEY `reviews_user_id_foreign` (`user_id`),
  CONSTRAINT `reviews_booking_id_foreign` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`) ON DELETE SET NULL,
  CONSTRAINT `reviews_room_type_id_foreign` FOREIGN KEY (`room_type_id`) REFERENCES `room_types` (`id`) ON DELETE SET NULL,
  CONSTRAINT `reviews_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 12. SITE SETTINGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `site_settings` (
  `id` char(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `key` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'site',
  `property_name` varchar(120) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Reservation',
  `logo_media_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `favicon_media_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `support_email` varchar(160) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `timezone` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'Europe/London',
  `currency` varchar(10) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'GBP',
  `check_in_time` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `check_out_time` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `reminder_hours_before` int NOT NULL DEFAULT '24',
  `social` json DEFAULT NULL,
  `default_seo` json DEFAULT NULL,
  `why_book_with_us` json DEFAULT NULL,
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `site_settings_key_unique` (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 13. AUDIT LOGS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` char(24) COLLATE utf8mb4_unicode_ci NOT NULL,
  `actor_id` char(24) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `actor_role` varchar(40) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `action` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_type` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `entity_id` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `before` json DEFAULT NULL,
  `after` json DEFAULT NULL,
  `metadata` json DEFAULT NULL,
  `ip` varchar(60) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` varchar(300) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` timestamp(3) NULL DEFAULT NULL,
  `updated_at` timestamp(3) NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `audit_logs_created_at_index` (`created_at`),
  KEY `audit_logs_entity_type_entity_id_created_at_index` (`entity_type`,`entity_id`,`created_at`),
  KEY `audit_logs_action_created_at_index` (`action`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 14. LARAVEL SUPPORT TABLES (password_resets, sessions, cache, jobs)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS `password_reset_tokens` (
  `email` varchar(160) COLLATE utf8mb4_unicode_ci NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `sessions` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `user_id` bigint unsigned DEFAULT NULL,
  `ip_address` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_unicode_ci,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_activity` int NOT NULL,
  PRIMARY KEY (`id`),
  KEY `sessions_user_id_index` (`user_id`),
  KEY `sessions_last_activity_index` (`last_activity`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `cache_locks` (
  `key` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `owner` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `expiration` int NOT NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `jobs` (
  `id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `attempts` tinyint unsigned NOT NULL,
  `reserved_at` int unsigned DEFAULT NULL,
  `available_at` int unsigned NOT NULL,
  `created_at` int unsigned NOT NULL,
  PRIMARY KEY (`id`),
  KEY `jobs_queue_index` (`queue`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `failed_jobs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `uuid` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `connection` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `queue` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `payload` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `exception` longtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `failed_at` datetime(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
