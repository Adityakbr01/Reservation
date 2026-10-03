# FLOW.md — How the Reservation App Works, Start to End

> Read this to understand the whole system in one sitting.
> Three apps, one backend: `client/` (guests) + `admin/` (staff) talk to
> `server/` (Express + MongoDB + Stripe + Resend + ImageKit).
> Golden rule: **the backend is authoritative** for availability, price,
> payment, and booking state. Frontends are UX only and re-verify everything.

---

## 1. The big picture (30 seconds)

```
Guest (client :5173) ──HTTPS──▶ API (:5000) ──▶ MongoDB Atlas
                                    │  ├─ Stripe (payments/refunds)
Admin (admin :5174) ──HTTPS──▶ API ─┤  ├─ Resend (emails, queued)
                                    │  └─ ImageKit (media binaries)
```

- Response contract everywhere: `{ success: true, data }` (+ `meta` on lists),
  errors `{ success: false, error: { code, message } }`.
- Auth: JWT Bearer, roles `user` / `admin`. Public reads need no login.
- Money: integer **minor units** (₹3000.00 = `300000`). Never floats.

---

## 2. Guest flow: search → book → pay → stay → (cancel)

### Step 1 — Search (`/`, HomePage)
1. Guest picks dates/guests → `POST /api/public/availability/search`.
2. Server computes free rooms = ACTIVE rooms minus **manual blocks**,
   minus **CONFIRMED/CHECKED_IN bookings**, minus **live Node-Cache holds**.
3. Room cards show rates from ACTIVE rate plans. Prices are **indicative only**.
4. Room page (`/rooms/:slug`) adds a **calendar** (`GET /api/public/availability/calendar`):
   green = free, amber = few left, red = full. Tapping two free dates fills the search.

### Step 2 — Quote (`/booking/new`, Step 0)
1. `POST /api/v1/bookings/quote` → server prices nights × plan + coupon −
   discount. Cached briefly (TTL), authoritative.
2. Coupon typed here is validated live (`POST /api/public/coupons/validate`).

### Step 3 — Guest details + HOLD (Step 1)
1. `POST /api/v1/bookings` (with `Idempotency-Key` header) → server:
   - rechecks dates, re-runs allocation **atomically** (two guests racing for
     the last room: exactly one wins, loser gets `ROOM_NO_LONGER_AVAILABLE`),
   - consumes coupon usage (global **and** per-guest limits),
   - writes a `HELD` booking + a **15-minute inventory hold**,
   - queues a `BOOKING_RECEIVED` email.
2. Booking reference looks like `QB-WQ9UFX` (never the Mongo id).

### Step 4 — Payment (Step 2, Stripe PaymentElement)
1. `POST /api/v1/payments/create-intent` → server creates the PaymentIntent for
   the **server-side total** (client amounts are ignored). Booking → `PAYMENT_PENDING`.
2. Guest pays → Stripe redirects to `/booking/confirmation/:id?redirect_status=…`.
3. **Stripe webhook** `POST /api/v1/webhooks/stripe` (raw body + signature check,
   idempotent event store) is the **only thing that can confirm money**:
   - `payment_intent.succeeded` → payment `PAID`, booking `CONFIRMED`, hold
     converted to occupancy, `BOOKING_CONFIRMED` + admin alert emails queued.
   - `payment_intent.payment_failed/canceled` → payment `FAILED`, booking stays
     retryable until the hold lapses → `EXPIRED`.
4. Confirmation page **polls** `GET /api/v1/bookings/:id` every 2.5s until terminal:
   spinner → confirmed card → (or "not active" for expired/cancelled).
   Local dev needs `stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe`,
   otherwise payments sit at `PROCESSING` forever **by design**.

### Step 5 — My Bookings (`/bookings`, login)
Flat list of your bookings with status, totals, pagination, deep-links back to
confirmation (where self-cancel lives).

### Step 6 — Cancel + refund (guest or admin)
1. `POST …/cancel` → policy engine decides: free cancel until **24h before
   check-in** = full refund of paid total, else pro-rata/nothing.
2. Unpaid → straight to `CANCELLED`. Paid → `REFUND_PENDING` + real Stripe refund
   → `charge.refunded` webhook → `CANCELLED` + payment `REFUNDED`
   (or `PARTIALLY_REFUNDED`). Double cancel → `BOOKING_NOT_CANCELLABLE`.
3. Every path queues `BOOKING_CANCELLED` (+ admin alert) and `REFUND_UPDATED` mails.

### Step 7 — Stay (`CONFIRMED → CHECKED_IN → CHECKED_OUT`)
- Admin Reservations → detail → **Check in / Check out** buttons.
- Guards: must be `CONFIRMED` + payment `PAID` + guest details present +
  **check-in day reached** (this is why `QB-WQ9UFX`, arriving 2026-10-10,
  cannot check in on 2026-10-03 — correct behavior, not a bug).
- Check-in/out stamps `stay.{checkedIn/OutAt/By}` and queues guest mails.
- `CHECKED_IN` rooms stay inventory-blocked; `CHECKED_OUT` frees them.

---

## 3. Admin flow (`admin/`, staff only)

| Screen | What it does |
|---|---|
| Dashboard | Inventory counts + today's ops (arrivals, departures, in-house, upcoming, awaiting payment, today's value) + alerts with deep links |
| Sales | Today / 7-day / 30-day: booked vs collected graph, net, refunds, per-room-type, **recent purchases** |
| Reservations | Search/filter/paginate, detail (guest, stay, pricing, payments, rooms), cancel + preview, refund retry, **check-in/out, move room** |
| Customers | Accounts, booking history, paid/refunded totals, enable/disable (disabled = 403 on next login; nobody can disable themselves) |
| Payments | Charges + refunds tabs; deep payment view (Stripe PI id, timeline, refunds) |
| Coupons | Create/edit/disable (disable preserves history; % or ₹, caps, minimums, windows, global + per-guest limits) |
| Notifications | Email queue monitor: QUEUED → SENT/FAILED with errors, manual retry |
| CMS | Pages (section builder), blog, FAQs, offers (+coupon link), policy docs; publish/unpublish/archive; draft preview tokens |
| Media | ImageKit uploads (JPEG/PNG/WebP/AVIF ≤ 8MB), alt text, delete blocked while referenced |
| Settings | Property profile, logo/favicon picker, check-in/out times, **reminder window** |
| Audit logs | Immutable who-did-what (cancels, refunds, stay moves, publishes, settings…) |

---

## 4. Background machinery (no clicks needed)

- **Notification worker** (in API process): every 30s sends due mails with
  backoff `0 / 1m / 5m / 15m / 1h` → then `FAILED` dead-letter for the monitor.
  Payloads carry routing only; templates render **fresh** data at send time.
- **Reminder sweep** (every 5m): `CONFIRMED` bookings checking in within the
  configured window get exactly one `CHECKIN_REMINDER` (`reminderSent` flag).
- **Hold-expiry sweep** (every 60s, plus lazy on-request): dead holds → `EXPIRED`.
- **Email failure never breaks booking/payment** — `CONFIRMED + FAILED-mail`
  is a valid state; the monitor + retry fixes delivery later.

---

## 5. State machines (the whole business in two diagrams)

**Booking:** `HELD → PAYMENT_PENDING → CONFIRMED → CHECKED_IN → CHECKED_OUT`
plus `→ EXPIRED` (hold lapsed) and `→ CANCELLED` (via `REFUND_PENDING` if paid).
Only `CONFIRMED`/`CHECKED_IN` block inventory.

**Payment:** `PENDING → PROCESSING → PAID → PARTIALLY_REFUNDED / REFUNDED`,
or `→ FAILED` (retryable while the hold lives).

**Content:** `DRAFT → PUBLISHED ⇄ DRAFT, → ARCHIVED → DRAFT`.
Only `PUBLISHED` is public; edits require the current `version` number
(stale editors get `CONTENT_VERSION_CONFLICT` instead of silent overwrites).

---

## 6. Where code lives (map)

- Booking engine → `server/src/modules/bookings/` (+ `hold.store.ts`)
- Money/pricing/coupons → `server/src/modules/{payments,coupons}/`, `utils/money.ts`
- Stay + policy → `booking.service.ts` (`checkInBlockReason`, `performCancel`)
- Emails → `server/src/emails/` (templates/provider), queue → `modules/notifications/`
- CMS/media/settings/SEO/audit/dashboard → `server/src/modules/{cms,media,settings,seo,audit,dashboard}/`
- Guest UI flow → `client/src/modules/{home,availability,rooms,booking}/`
- Staff UI → `admin/src/modules/*` (one folder per screen above)

## 7. Local-dev gotchas (read before "it's broken")

1. Payments stuck at `PROCESSING` → no webhook forwarding running (see §2 Step 4).
2. API `/ready` 503 → database unreachable. M0 free tier caps at **500
   connections** — close Compass/stray tabs; the API pool is capped at 10.
3. "Check-in day has not arrived yet" → booking starts in the future. Correct.
4. Confirmation page spins forever → webhook hasn't arrived (see 1).
5. `CONTENT_VERSION_CONFLICT` → reload the editor; someone (or you, in another
   tab) saved first.
