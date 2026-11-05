# GoDaddy Deluxe cPanel Deployment Guide - Reservation API (Laravel + MySQL)
# ==========================================================================

# This guide walks through deploying the Laravel reservation API on GoDaddy
# Deluxe Web Hosting with cPanel.

# ---------------------------------------------------------------------------
# PREREQUISITES
# ---------------------------------------------------------------------------
# 1. GoDaddy Deluxe Web Hosting account with cPanel access
# 2. PHP 8.1+ available in cPanel (PHP 8.4 recommended)
# 3. MySQL database available via cPanel
# 4. Domain or subdomain pointing to the hosting account
# 5. SSH access (recommended but optional; FTP upload works too)
# 6. Composer (can be installed via cPanel Terminal or uploaded locally)

# ---------------------------------------------------------------------------
# STEP 1: PREPARE THE LARAVEL PROJECT LOCALLY
# ---------------------------------------------------------------------------

# 1.1 Copy .env.example to .env and configure:
#   cp .env.example .env
#   # Edit .env with your GoDaddy database credentials, Stripe keys, etc.

# 1.2 Generate application key:
#   php artisan key:generate

# 1.3 Install dependencies (production only):
#   composer install --no-dev --optimize-autoloader

# 1.4 Optimize Laravel for production:
#   php artisan config:cache
#   php artisan route:cache
#   php artisan view:cache

# 1.5 Create deployment ZIP (exclude node_modules, .env, logs and uploaded files):
#   zip -r reservation-api.zip . --exclude="*.git*" --exclude="node_modules/*" --exclude=".env" --exclude="storage/logs/*" --exclude="storage/app/public/*"

# ---------------------------------------------------------------------------
# STEP 2: CREATE MYSQL DATABASE IN CPANEL
# ---------------------------------------------------------------------------

# 2.1 Log in to GoDaddy cPanel
# 2.2 Go to "MySQL Databases"
# 2.3 Create a new database (e.g., cpuser_reservation)
# 2.4 Create a new database user (e.g., cpuser_resuser)
# 2.5 Add the user to the database with "All Privileges"
# 2.6 Record: DB_HOST (usually localhost), DB_DATABASE, DB_USERNAME, DB_PASSWORD

# ---------------------------------------------------------------------------
# STEP 3: CONFIGURE DOMAIN / SUBDOMAIN
# ---------------------------------------------------------------------------

# Option A: Subdomain for API (recommended)
#   3.1 Go to "Subdomains" in cPanel
#   3.2 Create: api.yourdomain.com
#   3.3 Document Root: /home/cpuser/server-laravel/public
#
# Option B: Subdirectory
#   3.1 Document Root: /home/cpuser/public_html/api
#   3.2 Point the Laravel public/ directory to this location

# ---------------------------------------------------------------------------
# STEP 4: UPLOAD FILES
# ---------------------------------------------------------------------------

# 4.1 Via cPanel File Manager:
#     - Upload reservation-api.zip to /home/cpuser/
#     - Extract to /home/cpuser/server-laravel/
#
# 4.2 Via FTP:
#     - Upload the contents of server-laravel/ (excluding vendor/)
#     - Run `composer install --no-dev --optimize-autoloader` via SSH

# 4.3 Set permissions:
#     chmod 755 /home/cpuser/server-laravel
#     chmod 755 /home/cpuser/server-laravel/public
#     chmod 775 /home/cpuser/server-laravel/storage
#     chmod 775 /home/cpuser/server-laravel/bootstrap/cache
#     chmod -R 775 /home/cpuser/server-laravel/storage/*
#     chmod -R 775 /home/cpuser/server-laravel/bootstrap/cache/*

#   IMPORTANT: Do NOT use chmod 777.

# ---------------------------------------------------------------------------
# STEP 5: CONFIGURE .ENV
# ---------------------------------------------------------------------------

# 5.1 Create /home/cpuser/server-laravel/.env (from .env.example)
# 5.2 Set production values:
#
#   APP_ENV=production
#   APP_DEBUG=false
#   APP_URL=https://api.yourdomain.com
#
#   DB_CONNECTION=mysql
#   DB_HOST=localhost
#   DB_PORT=3306
#   DB_DATABASE=cpuser_reservation
#   DB_USERNAME=cpuser_resuser
#   DB_PASSWORD=your_db_password
#
#   JWT_SECRET=generate_a_strong_random_string
#
#   STRIPE_SECRET_KEY=sk_live_...
#   STRIPE_PUBLISHABLE_KEY=pk_live_...
#   STRIPE_WEBHOOK_SECRET=whsec_...
#
#   MEDIA_DISK=public
#
#   EMAIL_FROM=no-reply@yourdomain.com
#
#   FRONTEND_URL=https://yourdomain.com
#   ADMIN_URL=https://admin.yourdomain.com
#   CLIENT_URL=https://yourdomain.com

# 5.3 Never commit .env to version control.

# ---------------------------------------------------------------------------
# STEP 6: RUN MIGRATIONS
# ---------------------------------------------------------------------------

# 6.1 Via SSH (cPanel Terminal):
#     cd /home/cpuser/server-laravel
#     php artisan migrate --force
#
# 6.2 If SSH is not available, use cPanel's "PHP MySQL Admin" or
#     import database/migrations/*.sql manually via phpMyAdmin.

# ---------------------------------------------------------------------------
# STEP 7: CONFIGURE STORAGE
# ---------------------------------------------------------------------------

# 7.1 Create the public storage link (default setup):
#     php artisan storage:link
#
# 7.2 Ensure uploads are writable:
#     chmod -R 775 /home/cpuser/server-laravel/storage/app/public
#
# 7.3 Uploaded files are stored in storage/app/public and served from
#     https://api.yourdomain.com/storage/...
#
# 7.4 Optional FTP storage: install league/flysystem-ftp and enable the PHP
#     ftp extension, then set GODADDY_FTP_* env vars. Without these the media
#     service falls back to the public disk.

# ---------------------------------------------------------------------------
# STEP 8: CONFIGURE CRON JOBS
# ---------------------------------------------------------------------------

# 8.1 Go to "Cron Jobs" in cPanel
# 8.2 Add the following command for Laravel scheduler:
#
#     * * * * * /usr/local/bin/php /home/cpuser/server-laravel/artisan schedule:run >> /dev/null 2>&1
#
# 8.3 Adjust the PHP path and cPanel username as shown in your cPanel.

# ---------------------------------------------------------------------------
# STEP 9: ENABLE SSL / HTTPS
# ---------------------------------------------------------------------------

# 9.1 Go to "SSL/TLS" in cPanel
# 9.2 Install a free Let's Encrypt certificate via "SSL/TLS Status"
# 9.3 Force HTTPS:
#     - In cPanel: Domains -> Force HTTPS Redirect
#     - Or add to .htaccess:
#
#       RewriteCond %{HTTPS} off
#       RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]

# ---------------------------------------------------------------------------
# STEP 10: CONFIGURE STRIPE WEBHOOK
# ---------------------------------------------------------------------------

# 10.1 In Stripe Dashboard, add webhook endpoint:
#      https://api.yourdomain.com/api/v1/webhooks/stripe
# 10.2 Listen to events: payment_intent.succeeded, payment_intent.payment_failed,
#      charge.refunded, checkout.session.completed
# 10.3 Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET in .env

# ---------------------------------------------------------------------------
# STEP 11: VERIFY DEPLOYMENT
# ---------------------------------------------------------------------------

# 11.1 Health check:
#      curl https://api.yourdomain.com/api/health
#
# 11.2 Readiness check:
#      curl https://api.yourdomain.com/api/ready
#
# 11.3 API test:
#      curl https://api.yourdomain.com/api/
#
# 11.4 Verify the storage link:
#      ls -l /home/cpuser/server-laravel/public/storage
#
# 11.5 Verify .env is NOT accessible:
#      curl https://api.yourdomain.com/.env  (should return 403)

# ---------------------------------------------------------------------------
# STEP 12: ROLLBACK PLAN
# ---------------------------------------------------------------------------

# The existing Node.js backend remains intact at its original location.
# To rollback:
#   1. Point DNS/subdomain back to the Node.js backend
#   2. Keep the Laravel deployment as a fallback
#   3. Do not delete the MySQL database until you confirm stability

# ---------------------------------------------------------------------------
# PHP EXTENSIONS REQUIRED
# ---------------------------------------------------------------------------
# ctype, curl, dom, fileinfo, filter, hash, mbstring, openssl,
# pcre, pdo, pdo_mysql, session, tokenizer, xml

# Verify in cPanel: "Select PHP Version" -> extensions

# ---------------------------------------------------------------------------
# COMPOSER ON PRODUCTION
# ---------------------------------------------------------------------------
# composer install --no-dev --optimize-autoloader
# Never run `composer update` on production.
