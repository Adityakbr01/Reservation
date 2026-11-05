# API Mapping: Node.js → Laravel

## Authentication

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/auth/register` | `/api/v1/auth/register` | POST | None | Same |
| `/api/v1/auth/login` | `/api/v1/auth/login` | POST | None | Same |
| `/api/v1/auth/logout` | `/api/v1/auth/logout` | POST | JWT | Stateless |
| `/api/v1/auth/forgot-password` | `/api/v1/auth/forgot-password` | POST | None | Same |
| `/api/v1/auth/reset-password` | `/api/v1/auth/reset-password` | POST | None | Same |
| `/api/v1/auth/me` | `/api/v1/auth/me` | GET | JWT | Same |
| `/api/v1/auth/me` | `/api/v1/auth/me` | PATCH | JWT | Same |
| `/api/v1/auth/change-password` | `/api/v1/auth/change-password` | POST | JWT | Same |
| `/api/v1/auth/set-password` | `/api/v1/auth/set-password` | POST | JWT | Same |

## Admin Users

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/admin/users` | `/api/v1/admin/users` | GET | JWT+admin | Same |
| `/api/v1/admin/users/:id` | `/api/v1/admin/users/:id` | GET | JWT+admin | Same |
| `/api/v1/admin/users/:id/status` | `/api/v1/admin/users/:id/status` | PATCH | JWT+admin | Same |

## Property

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/public/property` | `/api/public/property` | GET | None | Same |
| `/api/v1/admin/properties` | `/api/v1/admin/properties` | GET | JWT+admin | Same |
| `/api/v1/admin/properties` | `/api/v1/admin/properties` | PATCH | JWT+admin | Same |

## Room Types

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/public/room-types` | `/api/public/room-types` | GET | None | Same |
| `/api/public/room-types/:slug` | `/api/public/room-types/:slug` | GET | None | Same |
| `/api/public/room-types/:id/offers` | `/api/public/room-types/:id/offers` | GET | None | Same |
| `/api/v1/admin/room-types` | `/api/v1/admin/room-types` | GET | JWT+admin | Same |
| `/api/v1/admin/room-types` | `/api/v1/admin/room-types` | POST | JWT+admin | Same |
| `/api/v1/admin/room-types/:id` | `/api/v1/admin/room-types/:id` | GET | JWT+admin | Same |
| `/api/v1/admin/room-types/:id` | `/api/v1/admin/room-types/:id` | PATCH | JWT+admin | Same |

## Rooms

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/admin/rooms` | `/api/v1/admin/rooms` | GET | JWT+admin | Same |
| `/api/v1/admin/rooms/occupancy` | `/api/v1/admin/rooms/occupancy` | GET | JWT+admin | Same |
| `/api/v1/admin/rooms` | `/api/v1/admin/rooms` | POST | JWT+admin | Same |
| `/api/v1/admin/rooms/:id` | `/api/v1/admin/rooms/:id` | GET | JWT+admin | Same |
| `/api/v1/admin/rooms/:id` | `/api/v1/admin/rooms/:id` | PATCH | JWT+admin | Same |

## Rate Plans

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/admin/rate-plans` | `/api/v1/admin/rate-plans` | GET | JWT+admin | Same |
| `/api/v1/admin/rate-plans` | `/api/v1/admin/rate-plans` | POST | JWT+admin | Same |
| `/api/v1/admin/rate-plans/:id` | `/api/v1/admin/rate-plans/:id` | GET | JWT+admin | Same |
| `/api/v1/admin/rate-plans/:id` | `/api/v1/admin/rate-plans/:id` | PATCH | JWT+admin | Same |
| `/api/v1/admin/rate-plans/:id/prices` | `/api/v1/admin/rate-plans/:id/prices` | GET | JWT+admin | Same |
| `/api/v1/admin/rate-plans/:id/prices` | `/api/v1/admin/rate-plans/:id/prices` | PUT | JWT+admin | Same |
| `/api/v1/admin/rate-plans/:id/prices/:date` | `/api/v1/admin/rate-plans/:id/prices/:date` | DELETE | JWT+admin | Same |

## Availability

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/public/availability/search` | `/api/public/availability/search` | POST | None | Same |
| `/api/public/availability/calendar` | `/api/public/availability/calendar` | GET | None | Same |
| `/api/v1/admin/availability` | `/api/v1/admin/availability` | GET | JWT+admin | Same |
| `/api/v1/admin/availability/blocks` | `/api/v1/admin/availability/blocks` | POST | JWT+admin | Same |
| `/api/v1/admin/availability/blocks/:id` | `/api/v1/admin/availability/blocks/:id` | DELETE | JWT+admin | Same |

## Coupons

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/public/coupons/validate` | `/api/public/coupons/validate` | POST | None | Same |
| `/api/v1/admin/coupons` | `/api/v1/admin/coupons` | GET | JWT+admin | Same |
| `/api/v1/admin/coupons` | `/api/v1/admin/coupons` | POST | JWT+admin | Same |
| `/api/v1/admin/coupons/:id` | `/api/v1/admin/coupons/:id` | GET | JWT+admin | Same |
| `/api/v1/admin/coupons/:id` | `/api/v1/admin/coupons/:id` | PATCH | JWT+admin | Same |

## Bookings

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/bookings/quote` | `/api/v1/bookings/quote` | POST | JWT | Same |
| `/api/v1/bookings` | `/api/v1/bookings` | POST | JWT | Same |
| `/api/v1/bookings/:id` | `/api/v1/bookings/:id` | GET | JWT | Same |
| `/api/v1/bookings/:id/receipt` | `/api/v1/bookings/:id/receipt` | GET | JWT | Same |
| `/api/v1/bookings/:id/cancel` | `/api/v1/bookings/:id/cancel` | POST | JWT | Same |
| `/api/me/bookings` | `/api/me/bookings` | GET | JWT | Same |
| `/api/me/bookings/:id` | `/api/me/bookings/:id` | GET | JWT | Same |

## Admin Reservations

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/admin/reservations` | `/api/v1/admin/reservations` | GET | JWT+admin | Same |
| `/api/v1/admin/reservations/:id` | `/api/v1/admin/reservations/:id` | GET | JWT+admin | Same |
| `/api/v1/admin/reservations/:id/cancel-preview` | `/api/v1/admin/reservations/:id/cancel-preview` | GET | JWT+admin | Same |
| `/api/v1/admin/reservations/:id/cancel` | `/api/v1/admin/reservations/:id/cancel` | POST | JWT+admin | Same |
| `/api/v1/admin/reservations/:id/refund` | `/api/v1/admin/reservations/:id/refund` | POST | JWT+admin | Same |
| `/api/v1/admin/reservations/:id/check-in` | `/api/v1/admin/reservations/:id/check-in` | POST | JWT+admin | Same |
| `/api/v1/admin/reservations/:id/check-out` | `/api/v1/admin/reservations/:id/check-out` | POST | JWT+admin | Same |
| `/api/v1/admin/reservations/:id/reassign` | `/api/v1/admin/reservations/:id/reassign` | POST | JWT+admin | Same |

## Payments

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/payments/create-intent` | `/api/v1/payments/create-intent` | POST | JWT | Same |
| `/api/v1/payments/:id` | `/api/v1/payments/:id` | GET | JWT | Same |

## Webhooks

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/webhooks/stripe` | `/api/v1/webhooks/stripe` | POST | None | Same (raw body for signature) |

## CMS (Admin)

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/admin/cms/pages` | `/api/v1/admin/cms/pages` | GET/POST | JWT+admin | Same |
| `/api/v1/admin/cms/pages/:id` | `/api/v1/admin/cms/pages/:id` | GET/PATCH | JWT+admin | Same |
| `/api/v1/admin/cms/pages/:id/status` | `/api/v1/admin/cms/pages/:id/status` | POST | JWT+admin | Same |
| `/api/v1/admin/cms/pages/:id/preview` | `/api/v1/admin/cms/pages/:id/preview` | POST | JWT+admin | Same |
| `/api/v1/admin/cms/blogs` | `/api/v1/admin/cms/blogs` | GET/POST | JWT+admin | Same |
| `/api/v1/admin/cms/blogs/:id` | `/api/v1/admin/cms/blogs/:id` | GET/PATCH | JWT+admin | Same |
| `/api/v1/admin/cms/blogs/:id/status` | `/api/v1/admin/cms/blogs/:id/status` | POST | JWT+admin | Same |
| `/api/v1/admin/cms/faqs` | `/api/v1/admin/cms/faqs` | GET/POST | JWT+admin | Same |
| `/api/v1/admin/cms/faqs/:id` | `/api/v1/admin/cms/faqs/:id` | PATCH/DELETE | JWT+admin | Same |
| `/api/v1/admin/cms/offers` | `/api/v1/admin/cms/offers` | GET/POST | JWT+admin | Same |
| `/api/v1/admin/cms/policies` | `/api/v1/admin/cms/policies` | GET/PUT | JWT+admin | Same |

## CMS (Public)

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/public/cms/pages/:slug` | `/api/public/cms/pages/:slug` | GET | None | Same |
| `/api/public/cms/blogs` | `/api/public/cms/blogs` | GET | None | Same |
| `/api/public/cms/blogs/:slug` | `/api/public/cms/blogs/:slug` | GET | None | Same |
| `/api/public/cms/faqs` | `/api/public/cms/faqs` | GET | None | Same |
| `/api/public/cms/offers` | `/api/public/cms/offers` | GET | None | Same |
| `/api/public/cms/policies/:key` | `/api/public/cms/policies/:key` | GET | None | Same |
| `/api/public/cms/preview/:token` | `/api/public/cms/preview/:token` | GET | None | Same |

## Media

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/admin/media` | `/api/v1/admin/media` | GET/POST | JWT+admin | Same |
| `/api/v1/admin/media/folders` | `/api/v1/admin/media/folders` | GET | JWT+admin | Same |
| `/api/v1/admin/media/resolve` | `/api/v1/admin/media/resolve` | GET | JWT+admin | Same |
| `/api/v1/admin/media/:id` | `/api/v1/admin/media/:id` | PATCH/DELETE | JWT+admin | Same |
| `/api/public/media/resolve` | `/api/public/media/resolve` | POST | None | Same |

## Settings

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/admin/settings` | `/api/v1/admin/settings` | GET/PATCH | JWT+admin | Same |
| `/api/public/cms/site-settings` | `/api/public/cms/site-settings` | GET | None | Same |

## SEO

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/sitemap.xml` | `/sitemap.xml` | GET | None | Same |
| `/robots.txt` | `/robots.txt` | GET | None | Same |

## Dashboard

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/api/v1/admin/dashboard/summary` | `/api/v1/admin/dashboard/summary` | GET | JWT+admin | Same |
| `/api/v1/admin/dashboard/sales` | `/api/v1/admin/dashboard/sales` | GET | JWT+admin | Same |

## Health

| Node.js Endpoint | Laravel Endpoint | Method | Auth | Notes |
|---|---|---|---|---|
| `/` | `/` | GET | None | Same |
| `/health` | `/health` | GET | None | Same |
| `/ready` | `/ready` | GET | None | Same |
