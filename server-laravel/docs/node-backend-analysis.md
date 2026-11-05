# Node.js Backend Analysis

## Existing System Overview
- **Framework**: Express.js v5.2.1
- **Runtime**: Node.js >= 20 (Bun for development)
- **Language**: TypeScript
- **Database**: MongoDB (Mongoose ODM) — migrating to MySQL 8.x
- **Package Manager**: bun / npm
- **ORM**: Mongoose (existing), Prisma (migration plan exists)
- **Entry Point**: `server/src/server.ts`
- **App Factory**: `server/src/app.ts`

## Authentication
- JWT-based stateless authentication
- Password hashing: bcryptjs
- Roles: `user`, `admin`
- Middleware: `authenticate` (verifies JWT + reloads user), `authorize("admin")`
- Endpoints: register, login, logout, forgot-password, reset-password, me, change-password, set-password

## Authorization
- Backend-enforced RBAC via `authenticate` + `authorize("admin")`
- Frontend route guards are UX only, not a security boundary

## Validation
- Zod schemas for request validation
- Express middleware `validate()` parses body/params/query
- Error format: `{ success: false, error: { code, message } }`

## Error Handling
- Centralized `errorHandler` middleware
- Consistent JSON error responses
- `AppError` class with code, status, and optional issues

## Rate Limiting
- Global rate limiter (express-rate-limit)
- Auth-specific rate limiter (`authRateLimiter`)

## CORS
- Configured origins from `CLIENT_URL`, `ADMIN_URL`, `EXTRA_ORIGINS`
- Wildcard for localhost and hamptworthstays.com / airoapp.ai domains
- Credentials enabled

## Logging
- Winston logger
- Request logger middleware

## External Integrations
- **Stripe**: PaymentIntents, webhooks (signature verification), idempotent events
- **Resend**: Email provider (with log fallback)
- **GoDaddy FTP**: Binary asset storage (migrated from ImageKit)
- **MongoDB Atlas**: Primary database (cannot reach from GoDaddy Node.js Hosting on port 27017)

## Background Jobs
- In-process notification worker (claim-based queue with retries)
- Exponential backoff, stale-claim reaper
- Check-in reminder sweep

## File Uploads
- Multer for multipart uploads
- Storage: GoDaddy FTP (FTPS)
- Public URL: `ASSETS_BASE_URL` (https://hamptworthstays.com/uploads)

## Database Models (28 collections)
users, properties, room_types, rooms, rate_plans, daily_prices,
cancellation_policies, availability_blocks, coupons, bookings,
booking_items, payments, refunds, webhook_events, cms_pages,
cms_blog_posts, cms_faqs, cms_offers, cms_policy_docs, media,
email_templates, enquiries, newsletter_subscribers, notifications,
reviews, site_settings, audit_logs

## API Base Path
- `/api/v1` for authenticated/admin APIs
- `/api/public` for public read APIs
- `/api/me` for user-scoped APIs
- `/` for SEO (sitemap.xml, robots.txt)
- `/api/v1/webhooks/stripe` for Stripe webhooks
