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

## 🔨 Phase 4 — Availability search (backend DONE, client UI next)

- **Built (backend):** `POST /api/public/availability/search` (docs 05 §37 +
  06 §5–6 exact) — overlap exclusion, occupancy rules, rate-plan validity +
  pricing, informational-only contract. Reservation/hold overlap plugs in
  with Phase 6; recheck-at-booking stays mandatory.
- **Next:** client search + results UI (dates/guests form → room cards).

## ⏳ Phase 5 — Pricing + coupons

- **Build:** quote endpoint (server-side totals, taxes/fees), coupon
  validate/apply, snapshot rules for historical bookings.
- **Why after availability:** pricing needs rate plans + occupancy + dates.
- **Docs:** `05` pricing, `06` coupons.
- **Exit:** quote → totals trusted by booking, coupons validate correctly.

## ⏳ Phase 6 — Booking + holds + My Bookings

- **Build:** `DRAFT → HELD → PAYMENT_PENDING → CONFIRMED` state machine,
  Node-Cache holds with expiry, atomic allocation, double-booking protection,
  `GET /api/me/bookings`.
- **Why after pricing:** booking stores priced snapshots + creates holds.
- **Docs:** `06` booking flow.
- **Exit:** concurrent same-room bookings cannot both confirm.

## ⏳ Phase 7 — Stripe payments + webhooks

- **Build:** PaymentIntent creation, webhook verify + idempotency,
  `webhookEvents` persistence, payment states, retry.
- **Why after booking:** payments attach to HELD bookings; webhook confirms them.
- **Docs:** `06` payments.
- **Exit:** paid webhook → CONFIRMED; failed → hold released, never confirmed.

## ⏳ Phase 8 — Cancellation + refunds

- **Build:** cancel rules, refund states, Stripe refunds, reconciliation.
- **Why after payments:** refunds reverse completed payments.
- **Docs:** `06` cancel/refund.
- **Exit:** cancel → refund recorded, inventory freed.

## ⏳ Phase 9 — Notifications + email

- **Build:** Resend templates (booking/payment/cancel/reminder), queued
  retries, idempotent sends. (Reset-password email already works.)
- **Why here:** needs booking + payment events to notify about.
- **Docs:** `06` email events.
- **Exit:** confirmation + reminder emails fire exactly once.

## ⏳ Phase 10 — Admin operations complete

- **Build:** dashboard, reservations, customers, check-in/out, payments view,
  coupons admin, notifications monitor.
- **Why here:** operates on bookings/payments built above.
- **Docs:** `07`.
- **Exit:** full reservation lifecycle manageable from admin app.

## ⏳ Phase 11 — CMS + media + SEO

- **Build:** pages/blogs/faqs/offers/policies lifecycle
  (DRAFT→PUBLISHED→ARCHIVED), ImageKit media metadata, site settings, SEO.
- **Why late:** independent of booking engine; decoupled content layer.
- **Docs:** `08`.
- **Exit:** publish flows + public published-only reads.

## ⏳ Phase 12 — Production hardening

- **Build:** audit logs, RBAC review, rate-limit tuning, indexes review,
  tests for critical flows, staging + launch checklist.
- **Why last:** hardens everything above.
- **Docs:** `02` acceptance, `09` phases 12–15.
- **Exit:** definition-of-done per feature + green production checklist.
