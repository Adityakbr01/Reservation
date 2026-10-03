# Step-by-Step Build Roadmap — Single-Property Reservation Platform

> Source of truth for WHAT comes after WHAT and WHY. Docs live in `docs/`
> (start with `README.md`, then `09_MASTER_PROJECT_IMPLEMENTATION_GUIDE.md`).
> Status legend: ✅ done · 🔨 in progress · ⏳ queued.

## Principles (non-negotiable)

1. Backend is authoritative for availability, price, payment, booking state.
2. One response contract everywhere: `{ success: true, data }`, errors
   `{ success: false, error: { code, message } }`, lists add
   `meta: { page, limit, total, totalPages }` (defaults page 1, 10 items).
3. Domain modules own their behavior: `routes → controller → service → repository → model`.
4. No marketplace/vendor/OTA scope. Single property, multiple room types,
   multiple physical rooms.

---

## ✅ Phase 1–2 — Foundation + Auth (DONE)

- **Built:** Bun + Express + TS + MongoDB + Node-Cache + Zod + Helmet/CORS/rate-limit +
  Winston + health/ready + graceful shutdown; Stripe/Resend/ImageKit clients;
  users + auth module (register/login/logout/me/update-me/change-password/
  forgot/reset, RBAC `user`/`admin`, admin seed, paginated admin list).
- **Frontend:** React Router + Query + Axios + Toast + shadcn + Tailwind + brand
  theme + Zustand session + full auth screens in `client` and `admin`.
- **Why first:** everything below needs identity (ownership, RBAC, audit actor).

## ✅ Phase 3 — Inventory (DONE: backend + admin UI)

- **Build:** `properties` (singleton seed + update), `roomTypes`, `rooms`
  (physical), `ratePlans`, `availabilityBlocks` — backend CRUD + public reads.
  Then admin UI pages (list + forms) for each.
- **Why now:** every later phase books *against* this data. No inventory =
  no availability, no pricing, no booking.
- **Docs:** `05` §8–§12, `07` §30–§41.
- **Exit:** room type → rooms → rate plan → block round-trip works via API.

## ✅ Phase 4 — Availability search (backend + client UI DONE)

- **Built (backend):** `POST /api/public/availability/search` (docs 05 §37 +
  06 §5–6 exact) — overlap exclusion, occupancy rules, rate-plan validity +
  pricing, informational-only contract. Reservation/hold overlap plugs in
  with Phase 6; recheck-at-booking stays mandatory.
- **Client UI:** home search + results, room detail with per-rate availability,
  deep-link booking flow — all live in `client`.
- **Verified live 2026-10-03:** search → quote → booking round-trip via API.

## ✅ Phase 5 — Pricing + coupons (backend DONE)

- **Built:** `utils/money` (integer minor units), `coupons` module (admin CRUD
  + public validate with validity/discount engine), `POST /api/v1/bookings/quote`
  (TTL-cached authoritative pricing, invalid coupons fail 422). Tax stays 0
  until the tax engine lands — rates are never invented.
- **Next:** coupon UI + price display ride with the booking flow (Phase 6).

## ✅ Phase 6 — Booking + holds + My Bookings (DONE, verified live)

- **Built:** `DRAFT → HELD → PAYMENT_PENDING → CONFIRMED` state machine,
  Node-Cache holds with expiry, atomic allocation, double-booking protection,
  `GET /api/me/bookings` + client `/bookings` My Bookings page (list,
  pagination, status, deep-link to confirmation).
- **Why after pricing:** booking stores priced snapshots + creates holds.
- **Docs:** `06` booking flow.
- **Exit (verified live 2026-10-03):** empty list → create → list shows
  `QB-Y5Y62X`; concurrent same-room bookings cannot both confirm (allocation
  guard); probe data cleaned up.

## ✅ Phase 7 — Stripe payments + webhooks (DONE, verified live)

- **Built:** PaymentIntent creation, webhook verify + idempotency,
  `webhookEvents` persistence, payment states, retry, client Stripe
  PaymentElement + polling confirmation page.
- **Why after booking:** payments attach to HELD bookings; webhook confirms them.
- **Docs:** `06` payments + §28.1 local forwarding.
- **Exit (verified live 2026-10-03):** paid webhook → CONFIRMED/PAID
  (`QB-WQ9UFX`); failed → hold released, never confirmed.

## ✅ Phase 8 — Cancellation + refunds (verified live 2026-10-03)

- **Built:** policy engine (`freeCancellationHours: 24`, full % refund),
  customer + admin cancel, `REFUND_PENDING`, Stripe refunds, `markRefundSucceeded`
  + unconditional webhook reconciliation (`handleRefunded` finalizes even when
  the refund was recorded synchronously-succeeded at creation time).
- **Docs:** `06` cancel/refund.
- **Exit (all probed live, test mode):** unpaid cancel → CANCELLED, zero refund;
  paid cancel → REFUND_PENDING + real Stripe refund → `charge.refunded` →
  CANCELLED/REFUNDED; double cancel → BOOKING_NOT_CANCELLABLE; admin
  list/detail/cancel-preview/cancel/refund/payments/refunds/policies OK;
  customer 403 + anonymous 401 on admin routes. Probe data cleaned up.
- **Fix (2026-10-03):** confirmation page was blank because client
  `fetchBooking` returned `{ booking, items }` as if it were the booking —
  now unwraps `data.booking`; unknown statuses render "not active" instead of
  crashing. Screenshot case (`redirect_status=succeeded` + expired hold)
  correctly shows "Booking not active". Without local webhook forwarding
  (`stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe`)
  payments stay PROCESSING by design — documented in `06` §28.1.

## ✅ Phase 9 — Notifications + email (DONE, verified live 2026-10-03)

- **Built:** `src/emails/` package (shared shell, provider abstraction
  Resend/log, templates split by domain: booking/payment/admin/auth) +
  `notifications` queue module (Mongo queue, idempotency keys, exp backoff
  0/1m/5m/15m/1h, in-process worker 30s + reminder sweep 5m).
- **Hooks:** BOOKING_RECEIVED on create; BOOKING_CONFIRMED + ADMIN_NEW_BOOKING
  on webhook success; PAYMENT_FAILED + alert on failure; BOOKING_CANCELLED +
  ADMIN_CANCELLATION + REFUND_UPDATED on cancel/refund; CHECKIN_REMINDER
  sweep (CONFIRMED, checkIn ≤ 24h, once via `reminderSent`).
- **Admin API:** `GET /api/v1/admin/notifications`, `POST /:id/retry`.
- **Tests:** `tests/notifications.test.ts` (13 cases: templates, keys, backoff).
- **Exit (verified live):** enqueue on booking; worker pickup + Resend attempt
  + failure requeue with error recorded; sweep enqueues once, second run
  no-op; admin list OK. Probe data cleaned up.
- **Note:** `ADMIN_NOTIFICATION_EMAIL` unset in dev → admin alerts skip
  silently; Resend test domain rejects non-owner recipients (failure path).

## ✅ Phase 10 — Admin operations complete (DONE, verified live 2026-10-03)

- **Server:** check-in/out, customers detail + enable/disable, dashboard
  summary, notifications admin API (all 10 live checks green).
- **Admin UI:** customers list/detail + disable, check-in/out buttons + stay
  stamp on reservation detail, coupons list/create/edit/disable, notifications
  monitor + retry, dashboard ops snapshot + alerts with deep links, nav entries.
- **Exit (verified live):** coupon create → public validate true → disable →
  validate false; customers list; admin build green. Probe data cleaned.
- **Docs:** `07`.

## ✅ Phase 11 — CMS + media + SEO (DONE, verified live 2026-10-03)

- **Server:** `cms` module (pages/blogs/faqs/offers/policies, lifecycle
  `DRAFT→PUBLISHED→ARCHIVED`, slug/reserved/unique rules, version conflicts,
  sanitizer + URL allowlist, preview tokens, published-only public API +
  admin detail endpoints), `media` (ImageKit, ref-check delete), `settings`
  singleton + safe public subset, `seo` sitemap/robots.
- **Admin UI:** content section (pages/blogs/faqs/offers/policies editors +
  publish controls), media library, settings form.
- **Tests:** `tests/cms.test.ts` (10 cases). Suite 73 pass, typecheck/lint
  clean, admin build green.
- **Exit (verified live):** draft→404→publish→200→stale-version 409→archive→404;
  reserved/duplicate/invalid slugs rejected; preview resolves; FAQ sanitized;
  settings patch; sitemap/robots; media list. Probe data cleaned.

## 🔨 Phase 12 — Production hardening (audit DONE, live probes BLOCKED)

- **Built:** append-only `audit-logs` module (13 actions, curated snapshots —
  no contact/secrets, actor + IP/UA, insert-only model with zero delete API),
  hooks in booking create/cancel, admin cancel/refund/check-in/out, customer
  enable/disable, CMS publish/unpublish/archive, settings, notification retry,
  coupon disable; admin `/audit-logs` page + nav; `tests/audit.test.ts`.
- **Verified offline 2026-10-03:** suite 78 pass, typecheck + lint clean,
  admin build green. RBAC review: every admin router enforces
  `authenticate + authorize("admin")`, customer routers owner-scoped, public
  readers published-only. Index review: all hot query paths covered
  (bookings status/checkIn/user, payments intent/booking, notifications
  status/nextAttempt, CMS status/slug, audit entity/action/time).
- **BLOCKED by Atlas outage:** audit live probe, concurrency probe
  (1 room / 2 customers → 1 wins), duplicate-webhook probe. API `/ready`
  503 — cluster unreachable from this machine (DNS ok, internet ok).
  Unblock: Atlas dashboard → cluster resumed + Network Access includes this
  IP, then rerun the three probes. No code changes needed for them.
- **Remaining checklist:** `EMAIL_FROM` to verified sender + API restart,
  `ADMIN_NOTIFICATION_EMAIL`, `stripe listen` for local webhooks, prod env +
  backup verification per `09` §86.
