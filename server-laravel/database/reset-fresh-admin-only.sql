-- ============================================================================
-- Reset Database: 100% Fresh State (ONLY Admin User in Entire Database)
-- ============================================================================
-- Run this in cPanel > phpMyAdmin > your database > SQL tab.
-- Uses DELETE FROM so InnoDB foreign key constraints never block execution.
-- Everything is wiped clean; ONLY admin@gmail.com remains.
-- ============================================================================

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Inventory & Booking Child Tables
DELETE FROM `daily_prices`;
DELETE FROM `availability_blocks`;
DELETE FROM `booking_items`;
DELETE FROM `payments`;
DELETE FROM `refunds`;
DELETE FROM `bookings`;
DELETE FROM `rate_plans`;
DELETE FROM `rooms`;
DELETE FROM `room_types`;
DELETE FROM `amenities`;
DELETE FROM `media`;
DELETE FROM `cancellation_policies`;
DELETE FROM `coupons`;
DELETE FROM `webhook_events`;

-- 2. CMS, Settings & Logs
DELETE FROM `cms_pages`;
DELETE FROM `cms_blog_posts`;
DELETE FROM `cms_faqs`;
DELETE FROM `cms_offers`;
DELETE FROM `cms_policy_docs`;
DELETE FROM `email_templates`;
DELETE FROM `enquiries`;
DELETE FROM `newsletter_subscribers`;
DELETE FROM `notifications`;
DELETE FROM `reviews`;
DELETE FROM `site_settings`;
DELETE FROM `audit_logs`;

-- 3. Properties (Parent Table)
DELETE FROM `properties`;

-- 4. Users: Delete all non-admin users
DELETE FROM `users` WHERE `email` != 'admin@gmail.com';

-- 5. Guarantee ONLY Admin User exists & is active
INSERT INTO `users` (`id`, `name`, `email`, `password_hash`, `role`, `is_active`, `created_at`, `updated_at`)
VALUES (
  '6ac0cc40a287cfd3dfbbf8a8',
  'Administrator',
  'admin@gmail.com',
  '$2y$12$jO5RwgoMCPHGkBEhZcWlrOhwnFrI8WKZQHH5o7Ha4U37aHt4KsTZu',
  'admin',
  1,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE
  `role` = 'admin',
  `is_active` = 1;

SET FOREIGN_KEY_CHECKS = 1;
