# Integrations: Node.js → Laravel

## Stripe Payments

| Aspect | Node.js | Laravel |
|---|---|---|
| Library | `stripe` npm package | `stripe/stripe-php` Composer package |
| Secret key | `STRIPE_SECRET_KEY` env | `config('services.stripe.secret_key')` |
| Webhook secret | `STRIPE_WEBHOOK_SECRET` env | `config('services.stripe.webhook_secret')` |
| Webhook endpoint | `/api/v1/webhooks/stripe` | `/api/v1/webhooks/stripe` |
| Signature verification | Raw body + Stripe webhook SDK | `StripeWebhookService` → `\Stripe\Webhook::constructEvent()` |
| Signature errors | 400 `INVALID_SIGNATURE` | 400 `INVALID_SIGNATURE` |
| Missing secret | 503 `STRIPE_WEBHOOK_NOT_CONFIGURED` | 503 `STRIPE_WEBHOOK_NOT_CONFIGURED` |
| Idempotency | `WebhookEvent` collection + idempotency keys | `webhook_events` table + `stripe_event_id` unique |
| PaymentIntent | Create/reuse | `PaymentIntent::create()` |
| Webhook events | `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded` | Same |

## Email (Resend)

| Aspect | Node.js | Laravel |
|---|---|---|
| Provider | Resend | Resend / Laravel Mail |
| API key | `RESEND_API_KEY` env | `MAIL_*` env or Resend transport |
| From address | `EMAIL_FROM` env | `config('mail.from.address')` |
| Queue | MongoDB + in-process worker | Database queue + `notifications:process` command |
| Templates | `src/emails/` package | `email_templates` table + Blade views |

## File Storage

Primary setup is Laravel's `public` disk. FTP remains available as an optional
legacy driver, but it needs the PHP `ftp` extension and `league/flysystem-ftp`;
otherwise the media service falls back to the public disk.

| Aspect | Node.js | Laravel |
|---|---|---|
| Default storage | GoDaddy FTP | `storage/app/public` (`MEDIA_DISK=public`) |
| Public URL | `ASSETS_BASE_URL` | `APP_URL/storage/...` through `public/storage` |
| Storage link | n/a | `php artisan storage:link` |
| Optional FTP | `basic-ftp` npm package | `config('filesystems.disks.ftp.*')` |
| Upload endpoint | `mediaUploadMany` middleware | `AdminMediaController@store` |
| Media fields | camelCase | camelCase (`fileName`, `storageKey`, `storageProvider`, `createdAt`) |
| Delete safety | reference check | Blocked while referenced by published CMS/room/property content |

## Database

| Aspect | Node.js | Laravel |
|---|---|---|
| Database | MongoDB Atlas | MySQL 8.x (GoDaddy cPanel) |
| ODM | Mongoose | Eloquent ORM |
| Connection | `MONGODB_URI` | `DATABASE_URL` / `DB_*` env |
| Migrations | None (Prisma planned) | Laravel migrations |
| Pool | Capped at 10 (Atlas incident) | MySQL connection limits |

## Authentication

| Aspect | Node.js | Laravel |
|---|---|---|
| Strategy | JWT (jsonwebtoken) | JWT (firebase/php-jwt) |
| Secret | `JWT_SECRET` env | `config('jwt.secret')` |
| Algorithm | HS256 | HS256 |
| TTL | `JWT_EXPIRES_IN` (7d) | `JWT_TTL` (60 min) |
| Refresh | Not implemented | `JWT_REFRESH_TTL` |
| User lookup | `findUserById(id)` | `User::find(id)` |
| Password hash | bcryptjs | `Hash::make()` / `Hash::check()` |

## CORS

| Aspect | Node.js | Laravel |
|---|---|---|
| Library | `cors` npm package | Custom `CorsMiddleware` |
| Origins | `CLIENT_URL`, `ADMIN_URL`, `EXTRA_ORIGINS` | `config('app.allowed_origins')` |
| Credentials | true | true |
| Methods | GET, POST, PUT, PATCH, DELETE, OPTIONS | Same |
| Headers | Content-Type, Authorization, etc. | Same |

## Background Jobs

| Aspect | Node.js | Laravel |
|---|---|---|
| Queue | In-process + MongoDB | Database queue + Artisan command |
| Worker | `startNotificationWorker()` | `php artisan notifications:process` |
| Scheduler | None | Laravel Scheduler (`schedule:run`) |
| Cron | None | cPanel: `* * * * * php artisan schedule:run` |
| Retries | Exponential backoff | Attempt counter + max_attempts |

## Audit Logging

| Aspect | Node.js | Laravel |
|---|---|---|
| Storage | MongoDB `audit_logs` | MySQL `audit_logs` table |
| Model | AuditLog | `App\Models\AuditLog` |
| Actions | 13 action types | Same actions |
| Fields | actor, action, entity, before/after, metadata, ip, userAgent | Same fields |
