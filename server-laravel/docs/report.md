# Hamptworth Stays API Simulation & Verification Report

> [!NOTE]
> **Test Environment**: Local MySQL 8.0 Docker container (`hamptworth-mysql`) running on port `3306`, PHP 8.2 development server on `http://127.0.0.1:8000`, matching the GoDaddy production database structure.

---

## 1. Executive Summary

A comprehensive automated End-to-End simulation test suite (`scratch/test-simulation-suite.js`) was built and executed against the Laravel backend. Across 28 targeted test scenarios spanning Authentication, CORS preflight, Resend email dispatch, single & multi-file media uploads, property settings, cottages, units, rate plans, availability search, coupons, dashboard analytics, and CMS policies, **all 28 tests achieved a 100% pass rate**.

```mermaid
flowchart TD
    Client["Client / React Admin (Port 5174)"] -->|CORS Preflight / JWT| API["Laravel API (Port 8000 / Live)"]
    API -->|HasHexId Trait & Migrations| MySQL["MySQL 8.0 (Docker / GoDaddy)"]
    API -->|Email Notifications (5s Timeout)| Resend["Resend Email API"]
    API -->|Media Storage| Storage["Local / Cloudinary Storage"]
```

---

## 2. Test Results Matrix

| # | Domain | Test Scenario | HTTP Method & Route | Status | Result | Details |
|---|---|---|---|:---:|:---:|---|
| 1 | **CORS** | Preflight `OPTIONS` returns CORS headers | `OPTIONS /api/v1/auth/login` | `204` | ✅ PASS | Origin `http://localhost:5174`, Methods, Allowed-Headers returned |
| 2 | **Auth** | Admin login with credentials | `POST /api/v1/auth/login` | `200` | ✅ PASS | JWT token generated for `admin@gmail.com` |
| 3 | **Auth** | Get authenticated profile | `GET /api/v1/auth/me` | `200` | ✅ PASS | User role `admin`, ID `6ac0cc40a287cfd3dfbbf8a8` |
| 4 | **Auth** | New user registration | `POST /api/v1/auth/register` | `201` | ✅ PASS | Auto welcome email triggered via Resend |
| 5 | **Auth** | Prevent duplicate registration | `POST /api/v1/auth/register` | `422` | ✅ PASS | Rejects duplicate email with clean validation error |
| 6 | **Auth** | Login with newly registered user | `POST /api/v1/auth/login` | `200` | ✅ PASS | Token generated for role `user` |
| 7 | **Email** | Direct Resend API test | `GET /test-email?token=hamptworth2026` | `200` | ✅ PASS | Handled cleanly with timeout protection |
| 8 | **Media** | Upload image via field `files` | `POST /api/v1/admin/media` | `201` | ✅ PASS | Matches React Admin `FormData.append('files', file)` contract |
| 9 | **Media** | Upload image via field `file` | `POST /api/v1/admin/media` | `201` | ✅ PASS | Single file fallback supported |
| 10 | **Media** | List media items with pagination | `GET /api/v1/admin/media?page=1` | `200` | ✅ PASS | Returns items array with pagination metadata |
| 11 | **Media** | List media folders | `GET /api/v1/admin/media/folders` | `200` | ✅ PASS | Returns folder categories |
| 12 | **Property** | Get Admin Property Details | `GET /api/v1/admin/property` | `200` | ✅ PASS | Supports both `/property` and `/properties` |
| 13 | **Cottage** | Create Cottage / Room Type | `POST /api/v1/admin/room-types` | `201` | ✅ PASS | Auto-assigns 24-char hex ID & root `property_id` |
| 14 | **Cottage** | Public room types listing | `GET /api/public/room-types` | `200` | ✅ PASS | Returns active cottages |
| 15 | **Cottage** | Admin get single cottage details | `GET /api/v1/admin/room-types/{id}` | `200` | ✅ PASS | Full cottage attributes returned |
| 16 | **Rooms** | Create Room Unit linked to Cottage | `POST /api/v1/admin/rooms` | `201` | ✅ PASS | Auto-resolves property ID; case-insensitive status |
| 17 | **Rooms** | List Rooms in Admin panel | `GET /api/v1/admin/rooms` | `200` | ✅ PASS | Units listed with parent `roomType` relation |
| 18 | **Policies** | Create Cancellation Policy | `POST /api/v1/admin/policies` | `201` | ✅ PASS | Policy created & persisted in `cancellation_policies` |
| 19 | **RatePlans** | Create Rate Plan for Cottage | `POST /api/v1/admin/rate-plans` | `201` | ✅ PASS | Auto slug, default restrictions & pricing structure |
| 20 | **Availability** | Public search availability | `POST /api/public/availability/search` | `200` | ✅ PASS | Calculates available units & daily rate sums |
| 21 | **Coupons** | Create Discount Coupon | `POST /api/v1/admin/coupons` | `201` | ✅ PASS | Normalizes coupon code uppercase; links property |
| 22 | **Reservations** | Admin list reservations | `GET /api/v1/admin/reservations` | `200` | ✅ PASS | Returns booking records array |
| 23 | **AuditLogs** | Admin list audit logs | `GET /api/v1/admin/audit-logs` | `200` | ✅ PASS | Returns operational audit records |
| 24 | **Amenities** | Admin list amenities | `GET /api/v1/admin/amenities` | `200` | ✅ PASS | Returns amenities list |
| 25 | **Dashboard** | Admin Dashboard Summary stats | `GET /api/v1/admin/dashboard/summary` | `200` | ✅ PASS | Real-time counts for arrivals, departures, guests |
| 26 | **Dashboard** | Admin Sales Report | `GET /api/v1/admin/dashboard/sales?range=week` | `200` | ✅ PASS | Robust summation preventing unknown column errors |
| 27 | **CMS** | Create / Upsert Policy Document | `PUT /api/v1/admin/cms/policies` | `200` | ✅ PASS | Persisted to `cms_policy_docs` |
| 28 | **CMS** | Public fetch Policy Document | `GET /api/public/cms/policies/terms` | `200` | ✅ PASS | Public terms & conditions document returned |

---

## 3. Root Causes & Core Fixes Implemented

### A. Non-Incrementing Hex String IDs (`Field 'id' doesn't have a default value`)
* **Root Cause**: The MongoDB-to-MySQL schema defines `$table->char('id', 24)->primary();` for all 25 core tables. Eloquent models assumed standard auto-incrementing integer IDs. When controllers passed `'id' => bin2hex(...)`, Eloquent stripped `'id'` during mass assignment because `'id'` was missing from `$fillable`.
* **Fix**: Created [`HasHexId`](file:///d:/CLIENT_PROJECTS/Reservation/server-laravel/app/Models/Concerns/HasHexId.php) trait. It dynamically registers `'id'` into `$fillable` via `initializeHasHexId()` and auto-generates a 24-character hex ID on the `creating` Eloquent event if empty. Applied across all 28 models.

### B. Media Upload Contract Mismatch (`The files field must be an array`)
* **Root Cause**: The React Admin panel appends a single `File` object under the key `"files"` (`form.append("files", file)`). In PHP/Laravel, a single file uploaded without square brackets (`files[]`) arrives as an `UploadedFile` object, failing Laravel's `'files' => ['array']` rule.
* **Fix**: Updated [`UploadMediaRequest.php`](file:///d:/CLIENT_PROJECTS/Reservation/server-laravel/app/Http/Requests/Media/UploadMediaRequest.php) and [`AdminMediaController.php`](file:///d:/CLIENT_PROJECTS/Reservation/server-laravel/app/Http/Controllers/API/Admin/AdminMediaController.php) to normalize either a single `UploadedFile` or array of `UploadedFile` items into a unified collection before passing to `MediaService`.

### C. Dashboard Sales Report Crash (`Unknown column 'total_amount'`)
* **Root Cause**: [`AdminDashboardController.php`](file:///d:/CLIENT_PROJECTS/Reservation/server-laravel/app/Http/Controllers/API/Admin/AdminDashboardController.php) executed `Booking::sum('total_amount')` and `Booking::sum('nights')`. However, the MySQL schema stores pricing and stay durations inside JSON columns (`pricing` and `stay`), causing SQL error 1054 and HTTP 500.
* **Fix**: Replaced direct column SQL sums with a resilient model iteration that inspects both top-level columns and nested JSON objects with Carbon date calculation fallbacks.

### D. Single Root Property Invariant
* **Root Cause**: RoomTypes, Rooms, RatePlans, and Coupons require a foreign key to `properties.id`. In a fresh database without content seeds, `Property::first()` was null, causing 404s or foreign key constraint failures.
* **Fix**: Updated [`DatabaseSeeder.php`](file:///d:/CLIENT_PROJECTS/Reservation/server-laravel/database/seeders/DatabaseSeeder.php) to seed only the `admin@gmail.com` account and ensure the root `Property` (`6ac0cc41a287cfd3dfbbf8a9`). Added fallback auto-creation in `AdminPropertyController` and `PublicPropertyController`.

### E. Apache CORS & Timeout Protection
* **Root Cause**: When downstream services (such as Resend or database operations) timed out or threw 500s on the live server, Apache did not send CORS headers, causing the browser to mask the error as a "CORS error".
* **Fix**: Updated [`public/.htaccess`](file:///d:/CLIENT_PROJECTS/Reservation/server-laravel/public/.htaccess) with `Header always set Access-Control-Allow-Origin "*"` (the `always` directive forces headers on any response code) and added an immediate 204 handler for `OPTIONS` preflight requests. In `NotificationService`, wrapped Resend API calls with a 5-second socket timeout and try/catch error logging.

---

## 4. cPanel Deployment Instructions

The deployment archive [`server-laravel-deploy.zip`](file:///d:/CLIENT_PROJECTS/Reservation/server-laravel/server-laravel-deploy.zip) (~330 KB) contains all the verified code, migrations, models, traits, controllers, and `.htaccess` file.

1. **Log in to cPanel** and navigate to **File Manager**.
2. Go to your application folder (e.g. `/home/ukqvtreb04u8/server-laravel` or the directory behind `laravel.hamptworthstays.com`).
3. Click **Upload** and upload `server-laravel-deploy.zip`.
4. Right-click `server-laravel-deploy.zip` and select **Extract** (replace existing files).
5. Open your browser and visit:
   ```text
   https://laravel.hamptworthstays.com/db-purify?token=hamptworth2026
   ```
   *(This ensures all columns and tables match the pure Laravel migration schema while preserving existing data)*.
6. If you want to seed the fresh admin user:
   ```text
   https://laravel.hamptworthstays.com/seed-admin?token=hamptworth2026
   ```
   *Admin Credentials*: `admin@gmail.com` / `admin@gmail.com`.
7. Refresh your Admin frontend (`http://localhost:5174/` or production URL) and verify smooth login, room management, media upload, and registration!

