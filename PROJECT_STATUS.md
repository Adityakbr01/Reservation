# Project Status — Reservation Platform (2026-10-03, evening)

> Source of truth for what is DONE, what is REMAINING, and why.
> Roadmap: `stepBystep.md`. Flows: `FLOW.md`. Specs: `docs/`.

## ✅ DONE (implemented + tested)

### Server (`server/src`)
- **Auth + users** — register/login/logout/me/update/change-password/forgot/reset,
  RBAC `user`/`admin`, admin seed, disabled-account blocking, customers
  detail + enable/disable. Every admin router enforces
  `authenticate + authorize("admin")` (reviewed, no gaps).
- **Inventory** — property singleton, room types, physical rooms, rate plans,
  availability blocks (admin CRUD + public reads).
- **Availability + pricing** — overlap-safe search, server-side pricing,
  coupons (CRUD + public validate), TTL quote, money in minor units.
- **Bookings + holds** — `HELD → PAYMENT_PENDING → CONFIRMED` state machine,
  Node-Cache holds with expiry, atomic allocation, My Bookings API.
- **Payments + webhooks** — PaymentIntent create/reuse, raw-body signature
  verify, idempotent events, PAID/FAILED handling, `charge.refunded`
  reconciliation (incl. sync-succeeded edge fix).
- **Cancellation + refunds** — policy engine (24h free cancel, % refunds),
  customer + admin cancel/preview/refund, `REFUND_PENDING` flow.
- **Notifications + email** — `src/emails/` package (Resend/log providers,
  templates per domain), Mongo queue, idempotency keys, exp backoff,
  in-process worker + check-in reminder sweep, admin list/retry API.
- **Stay lifecycle** — `CONFIRMED → CHECKED_IN → CHECKED_OUT` with pure
  guards, `stay.*` audit fields, CHECKED_IN/OUT mails.
- **Dashboard** — 9-card ops summary aggregation endpoint.
- **CMS / media / settings / SEO** — pages, blogs, FAQs, offers, versioned
  policy docs (lifecycle + slugs + sanitizer + preview tokens,
  published-only public API + admin detail endpoints), ImageKit media library
  with ref-check delete, settings singleton + safe public subset, sitemap +
  robots.
- **Audit logs** — append-only, curated snapshots (no secrets), 13 actions,
  admin list API. Unit-tested (snapshot + context tests).
- **Tests** — 83 bun tests green (`notifications`, `stay`, `cms`, `audit`,
  `sales`, `calendar`, `cancellation`, `webhook`, …), `tsc` + `oxlint` clean.
- **Images end-to-end** — media resolve APIs, pickers in room-type/blog/offer/
  page/settings editors, real photos on guest cards + detail + CMS renders.
- **Move room, payment detail, per-guest coupon caps, reminder window,
  hold-expiry timer, wide audit trail, admin month grid, all 12 CMS blocks,
  guest blog/FAQ/offers/policy pages** — all built + probed (see below).

### Admin (`admin/src`) — builds green
Dashboard (inventory + ops snapshot + alerts), reservations (list/detail,
cancel + preview, refund retry, **check-in/out**), customers, payments +
refunds tabs, coupons (list/create/edit/disable), notifications monitor +
retry, CMS (pages/blogs/FAQs/offers/policies editors + publish controls),
media library, settings, audit logs, full nav + route guards.

### Client (`client/src`) — builds green
Auth screens, home search + results, room detail, 3-step booking
(quote → guest details/hold → Stripe PaymentElement), polling confirmation
page (all states, crash-proof), **My Bookings** list + pagination, coupon
input, cancel flow.

## ❌ REMAINING (not implemented)

### Deliberately deferred (needs product decision, not code)
- Extra roles (SuperAdmin/Manager/Editor) — system runs on `user`/`admin` only.
- Tax engine — totals carry `taxes: 0` until rates are specified.
- Bulk cancel/refund — spec forbids without explicit approval (`07 §82`).

## ⏳ Needs YOU (no code missing)
- **Atlas connection-exhaustion incident (resolved):** M0 hit 501/500
  connections → new TLS handshakes rejected (looked like a shard fault).
  Fixed by capping the pool (`maxPoolSize: 10` in `server/src/config/database.ts`)
  + server restart. Keep an eye on Atlas Connections; close Compass/tabs if near limit.
- All three critical probes now green: audit rows, 1-room race (201 vs 409
  `ROOM_NO_LONGER_AVAILABLE`), duplicate webhook (single payment, zero dup mails).
- **`EMAIL_FROM`** must be a Resend-verified sender (+ API restart); optional
  `ADMIN_NOTIFICATION_EMAIL` for ops alerts. Until then mail fails at provider.
- **`stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe`** for local
  payment confirmation; without it payments stay `PROCESSING` by design.
- **Production launch** — prod env/DB, backups, monitoring, seed order (`09 §86`).
