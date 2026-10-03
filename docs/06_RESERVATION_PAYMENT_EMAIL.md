# 06_RESERVATION_PAYMENT_EMAIL.md

# Reservation, Payment & Email Business Logic Specification

**Project:** Single-Property Hotel Reservation Platform  
**Document:** 06 — Reservation, Payment & Email Business Logic  
**Status:** Development Specification  
**Audience:** Backend developers, frontend developers, admin developers, QA, AI coding agents  
**Depends on:** 01 Project Requirements PRD, 02 Scope & Acceptance, 03 User Flows, 04 System Architecture, 05 Database & API Specification

---

## 1. Purpose

This document defines the critical transactional business logic of the reservation platform.

It is the implementation contract for:

- room availability
- room inventory allocation
- date overlap rules
- pricing
- rate plans
- coupons
- taxes and fees
- temporary room holds
- booking lifecycle
- payment lifecycle
- Stripe integration
- webhook processing
- cancellations
- refunds
- check-in/check-out
- email notifications
- background jobs
- concurrency and double-booking prevention
- failure recovery
- reconciliation
- audit events
- acceptance testing

This document must be implemented consistently across the reservation frontend, management frontend, Express API, database, Redis, Stripe, and email provider.

---

# 2. Non-Negotiable Business Rules

The following rules are mandatory.

1. This is a **single-property** reservation system.
2. The property owns/operates multiple physical rooms.
3. A room can belong to exactly one room type.
4. Check-in date is inclusive.
5. Check-out date is exclusive.
6. A room occupied until June 10 is available for a booking beginning June 10.
7. Availability search is informational until final booking validation.
8. Final availability must always be rechecked on the backend.
9. The frontend must never be trusted to determine availability.
10. Payment success shown by the frontend is not sufficient to confirm a booking.
11. Stripe webhook confirmation is authoritative for successful payment.
12. Stripe webhook processing must be idempotent.
13. Temporary room holds must expire automatically.
14. Expired holds must not permanently block inventory.
15. Two concurrent customers must never receive the same physical room for overlapping dates.
16. Booking status and payment status are separate state machines.
17. Email failure must not roll back a successful booking or payment.
18. Email sending must be asynchronous where practical.
19. Every financial operation must be auditable.
20. Stripe secret keys must never reach the browser.
21. Refunds must be represented separately from the original payment.
22. Historical booking pricing must be preserved even if room/rate/coupon configuration later changes.
23. All money calculations must be performed server-side.
24. Client-provided totals must never be trusted.
25. Every state transition must be validated against the current state.
26. Cancellation/refund rules must be enforced by the backend.
27. Admin actions affecting reservations/payments must be authorized and audited.
28. Scheduled reminders must be idempotent.
29. Webhook events must be persisted before or during processing so duplicate delivery can be detected.
30. Database state remains the source of truth for booking and inventory state.

---

# 3. Core Concepts

## 3.1 Property

There is one active property.

The property contains:

- room types
- physical rooms
- rate plans
- availability blocks
- reservation configuration
- policies
- contact information
- timezone
- currency
- tax configuration

The system should still use a `propertyId` internally where useful so the domain remains clean, but this project does not implement multi-property marketplace behavior.

---

## 3.2 Room Type

A room type describes a sellable category.

Examples:

- Deluxe Room
- Garden View Room
- Suite

A room type may have multiple physical rooms.

Example:

```text
Deluxe Room
  ├── Room 101
  ├── Room 102
  ├── Room 103
  └── Room 104
```

Customers generally select a room type/rate rather than manually selecting a physical room.

---

## 3.3 Physical Room

A physical room is the actual inventory unit.

Example:

```text
roomType: Deluxe Room
roomNumber: 102
status: ACTIVE
```

A physical room cannot have overlapping confirmed/held bookings.

---

# 4. Date and Time Rules

## 4.1 Date-only Booking Model

Hotel stays should use calendar dates rather than arbitrary timestamps.

Example:

```text
checkIn: 2026-10-10
checkOut: 2026-10-13
```

This represents:

```text
Night 1: Oct 10
Night 2: Oct 11
Night 3: Oct 12
Checkout: Oct 13
```

Total nights:

```text
checkOut - checkIn = 3 nights
```

---

## 4.2 Check-Out Is Exclusive

Availability overlap is determined by:

```text
existingCheckIn < requestedCheckOut
AND
existingCheckOut > requestedCheckIn
```

Equivalent:

```text
overlap =
  existingCheckIn < requestedCheckOut &&
  existingCheckOut > requestedCheckIn
```

Example:

Existing booking:

```text
Jun 7 → Jun 10
```

Requested:

```text
Jun 10 → Jun 12
```

There is **no overlap**.

---

## 4.3 Invalid Date Requests

Reject:

```text
checkIn >= checkOut
```

Also reject:

- past check-in dates
- invalid date format
- dates outside configured booking window
- dates blocked by property policy

The exact booking-window policy should be configurable.

---

# 5. Availability Algorithm

## 5.1 Search Request

Example:

```json
{
  "checkIn": "2026-10-10",
  "checkOut": "2026-10-13",
  "adults": 2,
  "children": 1,
  "rooms": 1
}
```

---

## 5.2 Search Algorithm

For every active room type:

1. Load active physical rooms.
2. Find rooms with overlapping active reservations/holds.
3. Exclude unavailable rooms.
4. Calculate remaining physical inventory.
5. Apply occupancy rules.
6. Load applicable rate plans.
7. Calculate prices.
8. Return available room types/rates.

Pseudo-code:

```ts
for (const roomType of activeRoomTypes) {
  const rooms = await getActiveRooms(roomType.id);

  const blockedRoomIds = await getOverlappingBlockedRooms({
    checkIn,
    checkOut
  });

  const availableRooms = rooms.filter(
    room => !blockedRoomIds.has(room.id)
  );

  if (availableRooms.length === 0) continue;

  const rates = await getApplicableRatePlans({
    roomTypeId: roomType.id,
    checkIn,
    checkOut
  });

  results.push({
    roomType,
    availableCount: availableRooms.length,
    rates
  });
}
```

Search may use optimized aggregation/query strategies in production.

---

# 6. Search Is Not Final Availability

Search results may become stale immediately.

Example:

```text
Customer A searches → 1 room available
Customer B books the room
Customer A clicks Continue
```

Customer A must not be allowed to assume the room is still available.

Therefore:

```text
SEARCH
  ↓
SELECT ROOM/RATE
  ↓
BACKEND RECHECK
  ↓
CREATE HOLD
  ↓
PAYMENT
```

The hold operation is the authoritative inventory reservation step before payment.

---

# 7. Physical Room Allocation

## 7.1 Customer-Facing Behavior

Customers normally select:

```text
Room Type + Rate Plan
```

not:

```text
Room 101
```

The backend allocates a physical room.

---

## 7.2 Allocation Strategy

Recommended initial strategy:

1. Find active rooms belonging to the requested room type.
2. Exclude overlapping held/confirmed bookings.
3. Exclude blocked/out-of-service rooms.
4. Select one available room.
5. Attach it to the booking item.
6. Persist the allocation atomically.

Possible selection strategies:

- lowest room number
- deterministic stable ordering
- least recently allocated
- admin-defined priority

The first implementation can use deterministic ordering.

---

# 8. Multi-Room Booking

The system should support multiple rooms in one booking only if included in the agreed scope.

If enabled:

```json
{
  "rooms": [
    {
      "roomTypeId": "typeA",
      "ratePlanId": "rateA",
      "quantity": 2
    },
    {
      "roomTypeId": "typeB",
      "ratePlanId": "rateB",
      "quantity": 1
    }
  ]
}
```

The backend must allocate each required physical room.

All required allocations must succeed together.

If any allocation fails:

```text
No partial booking
No partial hold
No partial confirmation
```

Use a database transaction or equivalent atomic workflow.

---

# 9. Availability Blocks

Rooms may be unavailable for reasons unrelated to bookings.

Examples:

- maintenance
- owner block
- renovation
- emergency closure
- inspection

A room blocked for:

```text
Oct 10 → Oct 15
```

cannot be allocated during overlapping dates.

Availability must consider:

```text
Confirmed bookings
Active holds
Availability blocks
Room status
```

---

# 10. Pricing Engine

## 10.1 Server-Side Calculation

The client may display estimated prices, but the backend calculates the authoritative amount.

The frontend must never submit:

```json
{
  "total": 5000
}
```

and expect the backend to trust it.

Instead:

```json
{
  "roomTypeId": "...",
  "ratePlanId": "...",
  "checkIn": "...",
  "checkOut": "...",
  "couponCode": "..."
}
```

The backend calculates the final amount.

---

# 11. Nightly Price Calculation

For each stay night:

```text
nightlyRate
+ applicable fees
+ applicable taxes
- applicable discount
```

Then:

```text
subtotal = sum(all nights)
```

Example:

```text
Night 1 = ₹4,000
Night 2 = ₹4,500
Night 3 = ₹4,000

Room subtotal = ₹12,500
```

The exact tax/fee rules are configurable.

---

# 12. Historical Price Snapshot

At booking creation, store the values used for the transaction.

Example:

```json
{
  "roomTypeName": "Deluxe Room",
  "ratePlanName": "Flexible Rate",
  "nightlyRates": [
    {
      "date": "2026-10-10",
      "amount": 4000
    },
    {
      "date": "2026-10-11",
      "amount": 4500
    }
  ],
  "subtotal": 12500,
  "discount": 1000,
  "tax": 2070,
  "total": 13570,
  "currency": "INR"
}
```

If the admin later changes the room price, existing bookings must not change.

---

# 13. Rate Plans

Possible rate plans:

- Flexible
- Non-refundable
- Breakfast included
- Special offer
- Corporate
- Promotional

A rate plan may define:

- base price
- cancellation policy
- meal inclusion
- minimum stay
- maximum stay
- booking window
- occupancy rules
- active date range

The exact supported fields should match the final agreed product scope.

---

# 14. Coupon Calculation

Coupon validation must happen server-side.

Validation may include:

- active/inactive
- start/end date
- usage limit
- per-user usage limit
- minimum booking amount
- applicable room types
- applicable rate plans
- percentage vs fixed discount

Example:

```text
Subtotal: ₹12,500
Coupon: SAVE10
Discount: ₹1,250
```

Then:

```text
taxableAmount = subtotal - discount
```

if tax configuration requires tax after discount.

Tax treatment must follow the property's accounting/tax requirements.

---

# 15. Money Handling

Do not use floating-point arithmetic for financial calculations.

Prefer integer minor units.

Example:

```text
₹1,250.50
```

stored as:

```text
125050
```

with:

```text
currency = INR
```

Stripe amounts must use the currency's smallest supported unit.

Always use a centralized money utility.

---

# 16. Booking Creation Pipeline

Recommended flow:

```text
Customer submits booking
        ↓
Authenticate / validate guest
        ↓
Validate dates
        ↓
Validate room type/rate
        ↓
Validate occupancy
        ↓
Validate coupon
        ↓
Calculate authoritative price
        ↓
Recheck inventory
        ↓
Create temporary hold
        ↓
Create DRAFT/HELD booking
        ↓
Create Stripe PaymentIntent
        ↓
Return payment client secret
        ↓
Customer completes payment
        ↓
Stripe webhook
        ↓
Verify webhook
        ↓
Confirm payment
        ↓
Confirm booking
        ↓
Send confirmation email
```

---

# 17. Temporary Hold

## 17.1 Purpose

A hold prevents another customer from taking the selected inventory while the current customer completes payment.

Example:

```text
Room 102
Oct 10 → Oct 13
```

becomes:

```text
HELD
```

for a limited period.

---

## 17.2 Hold Duration

Recommended initial value:

```text
10–15 minutes
```

The exact duration must be configurable.

Example:

```text
holdExpiresAt = now + 15 minutes
```

---

# 18. Hold Rules

An active hold blocks inventory.

Expired holds do not.

Availability queries should treat a hold as active only when:

```text
status in [HELD, PAYMENT_PENDING]
AND
holdExpiresAt > now
```

Expired records can be cleaned asynchronously.

Do not rely only on a cleanup worker for correctness.

Availability queries must be able to recognize expired holds.

---

# 19. Hold Expiration

A background worker should periodically find:

```text
status = HELD/PAYMENT_PENDING
holdExpiresAt <= now
```

and transition them to:

```text
EXPIRED
```

If a PaymentIntent exists:

- determine whether payment actually succeeded
- do not expire a booking blindly if Stripe reports a successful payment
- reconcile with Stripe state when necessary

---

# 20. Booking State Machine

Recommended states:

```text
DRAFT
  ↓
HELD
  ↓
PAYMENT_PENDING
  ↓
CONFIRMED
  ↓
CHECKED_IN
  ↓
CHECKED_OUT
```

Alternative terminal/branch states:

```text
HELD → EXPIRED
PAYMENT_PENDING → EXPIRED
CONFIRMED → CANCELLED
CONFIRMED → REFUND_PENDING
REFUND_PENDING → CANCELLED
```

---

# 21. Valid Booking Transitions

| Current | Allowed Next State |
|---|---|
| DRAFT | HELD, CANCELLED |
| HELD | PAYMENT_PENDING, EXPIRED, CANCELLED |
| PAYMENT_PENDING | CONFIRMED, EXPIRED, CANCELLED |
| CONFIRMED | CHECKED_IN, CANCELLED |
| CHECKED_IN | CHECKED_OUT |
| CHECKED_OUT | none |
| EXPIRED | none |
| CANCELLED | none |

The backend must reject invalid transitions.

---

# 22. Payment State Machine

Payment states:

```text
PENDING
PROCESSING
PAID
FAILED
REFUNDED
PARTIALLY_REFUNDED
```

Possible lifecycle:

```text
PENDING
  ↓
PROCESSING
  ↓
PAID
```

Failure:

```text
PROCESSING → FAILED
```

Refund:

```text
PAID → PARTIALLY_REFUNDED
PAID → REFUNDED
```

---

# 23. Booking and Payment Are Separate

Never treat:

```text
booking.status === payment.status
```

as valid architecture.

Example:

```text
Booking: PAYMENT_PENDING
Payment: PROCESSING
```

or:

```text
Booking: CONFIRMED
Payment: PAID
```

or:

```text
Booking: CANCELLED
Payment: REFUNDED
```

They represent different domains.

---

# 24. Stripe Integration

## 24.1 Stripe Ownership

The client/property owner should use their own Stripe account.

The developer does not own:

- Stripe funds
- Stripe account
- bank settlement
- customer disputes
- chargebacks

The developer only implements the integration.

---

# 25. Stripe PaymentIntent

Recommended flow:

```text
Backend creates PaymentIntent
        ↓
Stripe returns client_secret
        ↓
Frontend uses Stripe.js
        ↓
Customer authenticates/pays
        ↓
Stripe processes payment
        ↓
Stripe sends webhook
        ↓
Backend verifies webhook
        ↓
Backend updates payment/booking
```

Stripe secret key remains backend-only.

---

# 26. Payment Amount Integrity

The PaymentIntent amount must be generated from the backend's authoritative booking total.

Never use:

```text
frontendTotal
```

as the source.

Use:

```text
serverCalculatedTotal
```

Example:

```ts
const amount = booking.pricing.totalMinorUnits;

await stripe.paymentIntents.create({
  amount,
  currency: booking.currency.toLowerCase(),
  metadata: {
    bookingId: booking.id
  }
});
```

---

# 27. Stripe Metadata

Recommended metadata:

```json
{
  "bookingId": "...",
  "propertyId": "...",
  "environment": "production"
}
```

Do not put sensitive personal information into Stripe metadata.

---

# 28. Stripe Webhook

The webhook endpoint must:

1. Receive raw request body.
2. Verify Stripe signature.
3. Parse the verified event.
4. Check idempotency.
5. Persist webhook event information.
6. Process relevant event.
7. Update payment/booking.
8. Commit transaction where applicable.
9. Return success.

## 28.1 Local Development Delivery

Stripe cannot reach `localhost`, so without forwarding no webhook ever
arrives. Install the Stripe CLI (Windows: `winget install Stripe.StripeCLI`),
log in once, then forward test events to the local API:

```text
stripe login
stripe listen --forward-to localhost:5000/api/v1/webhooks/stripe
```

Use the printed `whsec_...` value as `STRIPE_WEBHOOK_SECRET` and restart
the API. Keep `stripe listen` running while testing payments — every
`payment_intent.succeeded`, `payment_intent.payment_failed`, and
`charge.refunded` then reaches the local webhook endpoint.

A payment completed while forwarding was off can be completed
afterwards by replaying its authentic event:

```text
stripe events resend evt_...
```

Without forwarding, the following is expected and is not a bug:

```text
payment stays PROCESSING (admin Payments screen)
booking stays HELD / PAYMENT_PENDING (confirmation page keeps polling)
hold expiry transitions the booking to EXPIRED
```

---

# 29. Important Stripe Events

At minimum consider:

```text
payment_intent.succeeded
payment_intent.payment_failed
payment_intent.canceled
charge.refunded
```

Exact event support can expand as implementation needs require.

---

# 30. Webhook Idempotency

Stripe can deliver an event more than once.

Example:

```text
event_123
event_123
event_123
```

The backend must process it once.

Store:

```text
stripeEventId
eventType
receivedAt
processedAt
processingStatus
```

If the same event ID is already processed:

```text
return success
```

without repeating financial side effects.

---

# 31. Payment Success Handling

When:

```text
payment_intent.succeeded
```

is verified:

1. Find payment using PaymentIntent ID.
2. Ensure payment has not already been marked paid.
3. Verify expected amount/currency where applicable.
4. Mark payment as PAID.
5. Confirm booking if all confirmation conditions are satisfied.
6. Convert temporary inventory hold into confirmed booking occupancy.
7. Record timestamps.
8. Create confirmation notification/email job.
9. Add audit event.

All operations must be idempotent.

---

# 32. Payment Failure Handling

When payment fails:

1. Store failure reason safely.
2. Mark payment `FAILED`.
3. Keep booking in a retryable state if hold is still active.
4. Allow customer to retry payment where supported.
5. Do not confirm booking.
6. If hold expires, transition booking to `EXPIRED`.
7. Notify customer if configured.

Do not expose raw Stripe/internal error details unnecessarily.

---

# 33. Payment Retry

A customer may retry payment while the hold remains valid.

Possible flow:

```text
HELD
 ↓
PAYMENT_PENDING
 ↓
FAILED
 ↓
PAYMENT_PENDING
 ↓
PAID
```

The implementation must prevent multiple successful payments from creating inconsistent booking state.

If multiple PaymentIntents are created, each must be associated with the same booking and handled idempotently.

---

# 34. Payment Timeout

If the customer leaves checkout:

```text
PaymentIntent remains incomplete
```

The booking remains held only until:

```text
holdExpiresAt
```

After expiration:

```text
booking → EXPIRED
```

The system must not permanently reserve inventory.

## 34.1 Confirmation Page Behavior

After Stripe redirects back with `redirect_status=succeeded`, the
confirmation page polls `GET /bookings/:id` every 2.5 seconds until the
booking reaches a terminal state (`CONFIRMED`, `CANCELLED`, `EXPIRED`):

```text
HELD / PAYMENT_PENDING → "Confirming your payment" (polling)
CONFIRMED → booking reference card
EXPIRED / CANCELLED → "Booking not active" card
```

The Stripe URL parameters (`payment_intent`, `redirect_status`) are
informational only — the webhook is authoritative. The page must render a
card for every state and must never crash on an unexpected payload shape.

---

# 35. Cancellation Rules

Cancellation depends on the selected rate plan/property policy.

Possible policies:

```text
Free cancellation until X hours before check-in
Non-refundable
Partial refund
No refund
```

The cancellation service should calculate:

```text
isCancellable
refundAmount
refundPercentage
reason
```

on the backend.

---

# 36. Cancellation Flow

Customer:

```text
My Booking
   ↓
Cancel Booking
   ↓
Backend validates cancellation policy
   ↓
Calculate refund
   ↓
Confirm cancellation
   ↓
Create Stripe refund if applicable
   ↓
Update booking/payment
   ↓
Release inventory
   ↓
Send cancellation email
```

---

# 37. Refund Lifecycle

Refund should be represented separately.

Example:

```text
Payment:
PAID

Refund:
PENDING
```

Then:

```text
Refund:
SUCCEEDED
```

Payment may become:

```text
PARTIALLY_REFUNDED
```

or:

```text
REFUNDED
```

depending on total refunded amount.

---

# 38. Refund Idempotency

A retry must not create duplicate refunds.

Use an application-level idempotency key such as:

```text
refund:{bookingId}:{refundReason}:{uniqueOperationId}
```

and Stripe's idempotency mechanism where appropriate.

Store the Stripe refund ID.

---

# 39. Check-In

Admin/authorized staff can mark a confirmed booking:

```text
CONFIRMED → CHECKED_IN
```

Before check-in:

- booking must be confirmed
- required guest details must exist
- payment status must satisfy property policy

Record:

```text
checkedInAt
checkedInBy
```

---

# 40. Check-Out

Authorized staff can transition:

```text
CHECKED_IN → CHECKED_OUT
```

Record:

```text
checkedOutAt
checkedOutBy
```

Optional operational fields can be added later if housekeeping/POS functionality is separately scoped.

---

# 41. Scheduled Check-In Reminder

Recommended reminder:

```text
24 hours before check-in
```

Exact timing should be configurable.

Worker logic:

```text
Find confirmed bookings
where checkIn = reminderWindow
and reminderSent = false
```

Then enqueue reminder email.

After successful enqueue/send:

```text
reminderSent = true
```

Use an idempotency key to prevent duplicate reminders.

---

# 42. Email Event Matrix

| Event | Recipient | Required |
|---|---|---|
| Booking created/received | Customer | Yes |
| Payment confirmed | Customer | Yes |
| Payment failed | Customer | Yes/configurable |
| Booking confirmed | Customer | Yes |
| Booking cancelled | Customer | Yes |
| Refund update | Customer | Yes |
| Check-in reminder | Customer | Yes |
| Check-in completed | Customer | Optional/configurable |
| Check-out completed | Customer | Optional/configurable |
| New booking alert | Admin | Recommended |
| Payment failure alert | Admin | Recommended |
| Cancellation alert | Admin | Recommended |

---

# 43. Booking Confirmation Email

Should include:

- guest name
- booking reference
- property name
- room type
- stay dates
- number of nights
- guests
- pricing summary
- taxes/fees
- total paid
- payment status
- cancellation policy summary
- property contact details
- relevant instructions

Do not expose internal database IDs.

---

# 44. Payment Failure Email

Include:

- booking reference
- payment status
- safe explanation
- retry instructions
- hold expiry information if appropriate
- support contact

Do not include sensitive payment details.

Never email:

- full card number
- CVV
- Stripe secret key
- internal tokens

---

# 45. Cancellation Email

Include:

- booking reference
- cancelled stay dates
- cancellation timestamp
- refund amount
- refund status
- expected refund information where appropriate
- support contact

---

# 46. Email Architecture

Recommended:

```text
Domain Event
   ↓
Notification Service
   ↓
Queue
   ↓
Email Worker
   ↓
Email Provider
```

Example:

```text
BookingConfirmed
      ↓
enqueueEmail({
  type: "BOOKING_CONFIRMED",
  bookingId
})
```

The worker fetches the required data and renders the template.

---

# 47. Email Templates

Templates should be manageable through configuration/CMS/admin where included.

Recommended template keys:

```text
BOOKING_RECEIVED
BOOKING_CONFIRMED
PAYMENT_FAILED
BOOKING_CANCELLED
REFUND_UPDATED
CHECKIN_REMINDER
CHECKED_IN
CHECKED_OUT
ADMIN_NEW_BOOKING
ADMIN_PAYMENT_FAILURE
ADMIN_CANCELLATION
```

Templates should support variables such as:

```text
{{guestName}}
{{bookingReference}}
{{checkIn}}
{{checkOut}}
{{roomTypeName}}
{{totalAmount}}
{{currency}}
```

Template rendering must sanitize or safely encode dynamic values.

---

# 48. Email Failure Handling

If email fails:

```text
Booking remains CONFIRMED
Payment remains PAID
```

Email failure must not corrupt the transactional state.

Worker should:

1. retry
2. use exponential backoff
3. log failure
4. mark final failure after retry limit
5. optionally move to dead-letter/failure storage
6. expose failure to admin monitoring

---

# 49. Notification Idempotency

A notification should have a unique business key.

Example:

```text
BOOKING_CONFIRMED:{bookingId}
```

For check-in reminder:

```text
CHECKIN_REMINDER:{bookingId}:{checkInDate}
```

Before creating/sending:

```text
if alreadySentOrQueued(key):
    skip
```

---

# 50. Background Jobs

Recommended workers:

```text
Reservation Worker
Payment/Reconciliation Worker
Email Worker
Hold Expiration Worker
Reminder Worker
```

For a small initial deployment, these may run from one worker process with separate job handlers.

---

# 51. Hold Expiration Worker

Frequency:

```text
every 30–60 seconds
```

or another reasonable interval.

Job:

```text
find expired HELD/PAYMENT_PENDING bookings
```

For each:

1. acquire safe lock if required
2. re-check current state
3. check payment provider state if payment exists
4. expire only when safe
5. release inventory
6. audit transition
7. optionally notify customer

---

# 52. Payment Reconciliation Worker

Used to handle edge cases where:

```text
Stripe webhook delayed
webhook processing failed
network error occurred
application crashed
```

The worker can identify:

```text
PAYMENT_PENDING
```

bookings with associated PaymentIntents and reconcile against Stripe.

Important:

Reconciliation must not create duplicate payment/refund side effects.

---

# 53. Concurrency Problem

Example:

```text
Room 101
available: 1
```

Customer A and B click Book at almost exactly the same time.

Naive implementation:

```text
A checks availability → available
B checks availability → available
A creates booking
B creates booking
```

This causes double booking.

The system must make final allocation atomic.

---

# 54. Recommended Concurrency Strategy

Use layered protection:

```text
Application validation
+
Database transaction/atomic write
+
Redis lock where useful
+
Final overlap validation
```

Redis should improve coordination, but database correctness must not depend solely on Redis.

---

# 55. Lock Key

Example:

```text
inventory-lock:{roomTypeId}:{checkIn}:{checkOut}
```

For exact room allocation:

```text
room-lock:{roomId}:{checkIn}:{checkOut}
```

Lock should have a TTL to avoid permanent deadlocks.

Never hold a Redis lock longer than necessary.

---

# 56. Race Condition Handling

When allocation fails because another transaction won the race:

Return a controlled business error:

```text
ROOM_NO_LONGER_AVAILABLE
```

Frontend should:

1. show a clear message
2. refresh availability
3. allow customer to choose another room/rate

Do not show a generic:

```text
500 Internal Server Error
```

for a known inventory conflict.

---

# 57. Database Transaction Boundary

Booking creation should ideally be transactional around:

```text
availability recheck
+
room allocation
+
booking creation
+
booking item creation
+
hold creation
```

Stripe API calls should not be blindly embedded inside a long-running database transaction.

Preferred pattern:

```text
DB transaction
    ↓
create HELD booking
    ↓
commit
    ↓
create PaymentIntent
    ↓
update booking/payment references
```

If Stripe creation fails:

```text
booking remains held temporarily
```

then retry/cleanup according to business rules.

---

# 58. Stripe and Database Failure Scenarios

## Scenario A

Database succeeds.

Stripe PaymentIntent creation fails.

Result:

```text
Booking = HELD
Payment = PENDING
```

System can retry.

---

## Scenario B

Stripe succeeds.

Database update fails.

Result:

```text
Stripe = payment exists
Application DB = incomplete
```

Reconciliation worker must recover the state.

---

## Scenario C

Customer pays.

Webhook arrives twice.

Result:

```text
Payment marked PAID once
Booking confirmed once
Confirmation email queued once
```

---

## Scenario D

Webhook arrives after hold expiration.

Backend must inspect the payment state and decide whether the booking can still be confirmed safely.

Never blindly confirm an expired booking without verifying inventory and business rules.

---

# 59. Payment Reconciliation Rules

Reconciliation should compare:

```text
Application payment status
vs
Stripe PaymentIntent status
```

Potential mismatches:

```text
DB=PENDING
Stripe=SUCCEEDED

DB=PAID
Stripe=FAILED

DB=PAID
Stripe=REFUNDED
```

Each mismatch requires a defined recovery path.

Never automatically overwrite financial state without verifying the event and expected booking/payment relationship.

---

# 60. Audit Events

Important events:

```text
BOOKING_CREATED
BOOKING_HELD
BOOKING_EXPIRED
BOOKING_CONFIRMED
BOOKING_CANCELLED
CHECK_IN_COMPLETED
CHECK_OUT_COMPLETED

PAYMENT_CREATED
PAYMENT_PROCESSING
PAYMENT_SUCCEEDED
PAYMENT_FAILED

REFUND_CREATED
REFUND_SUCCEEDED
REFUND_FAILED

COUPON_APPLIED
COUPON_REJECTED

ROOM_ALLOCATED
ROOM_RELEASED

EMAIL_QUEUED
EMAIL_SENT
EMAIL_FAILED

STRIPE_WEBHOOK_RECEIVED
STRIPE_WEBHOOK_PROCESSED
STRIPE_WEBHOOK_FAILED
```

Admin actions should include actor information.

---

# 61. Customer Booking Reference

Generate a human-readable booking reference.

Example:

```text
QB-7F3K92
```

Rules:

- unique
- non-sequential if possible
- safe to show to customers
- searchable by admin
- not the Mongo `_id`

Do not expose raw internal IDs unnecessarily.

---

# 62. API Business Endpoints

Core customer endpoints:

```http
GET /api/v1/availability
POST /api/v1/bookings/quote
POST /api/v1/bookings
GET /api/v1/bookings/:id
POST /api/v1/bookings/:id/cancel
POST /api/v1/bookings/:id/payment/retry
```

Payment:

```http
POST /api/v1/payments/create-intent
GET /api/v1/payments/:id
```

Stripe:

```http
POST /api/v1/webhooks/stripe
```

Admin:

```http
POST /api/v1/admin/bookings/:id/check-in
POST /api/v1/admin/bookings/:id/check-out
POST /api/v1/admin/bookings/:id/cancel
POST /api/v1/admin/bookings/:id/refund
```

Actual routes must remain consistent with `05_DATABASE_AND_API_SPEC.md`.

---

# 63. Quote Endpoint

A quote endpoint can provide authoritative pre-booking pricing.

Example:

```http
POST /api/v1/bookings/quote
```

Request:

```json
{
  "checkIn": "2026-10-10",
  "checkOut": "2026-10-13",
  "roomTypeId": "room_type_id",
  "ratePlanId": "rate_plan_id",
  "quantity": 1,
  "couponCode": "SAVE10"
}
```

Response:

```json
{
  "quoteId": "quote_123",
  "expiresAt": "2026-10-03T12:30:00Z",
  "pricing": {
    "subtotal": 1250000,
    "discount": 100000,
    "tax": 207000,
    "total": 1357000,
    "currency": "INR"
  }
}
```

Quote expiration prevents indefinite reuse.

The booking endpoint must still recalculate pricing.

---

# 64. Booking Creation API

Recommended request:

```json
{
  "checkIn": "2026-10-10",
  "checkOut": "2026-10-13",
  "rooms": [
    {
      "roomTypeId": "type_id",
      "ratePlanId": "rate_id",
      "quantity": 1
    }
  ],
  "guest": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+91XXXXXXXXXX"
  },
  "couponCode": "SAVE10"
}
```

Backend returns:

```json
{
  "booking": {
    "id": "...",
    "reference": "QB-7F3K92",
    "status": "PAYMENT_PENDING",
    "holdExpiresAt": "..."
  },
  "payment": {
    "provider": "stripe",
    "paymentIntentId": "...",
    "clientSecret": "..."
  }
}
```

Never return Stripe secret key.

---

# 65. Frontend Payment Flow

Frontend:

```text
Create booking
    ↓
Receive clientSecret
    ↓
Render Stripe payment UI
    ↓
Confirm payment
    ↓
Show processing state
    ↓
Wait for backend confirmation
```

Do not immediately display:

```text
Booking confirmed
```

solely because Stripe.js returns successfully.

Instead display:

```text
Payment processing / confirmation
```

until application state is confirmed.

---

# 66. Confirmation Page

Confirmation page should show:

- booking reference
- property
- dates
- guest details
- room
- pricing
- payment status
- booking status
- support contact

It should be possible to load confirmation state from the backend.

---

# 67. Customer My Bookings

Customer can see only their own bookings.

For each booking:

```text
reference
dates
room
status
payment status
total
actions
```

Possible actions:

```text
View details
Cancel
Retry payment
```

Actions must be backend-authorized.

---

# 68. Guest Checkout Decision

The architecture can support:

```text
authenticated checkout
```

or:

```text
guest checkout + optional account creation
```

This must be finalized before implementation.

If guest checkout is enabled:

- booking must store guest contact details
- customer access must use secure verification
- My Bookings access cannot rely only on booking reference

Do not expose booking data through predictable IDs.

---

# 69. Security Rules for Booking Access

A customer must not be able to request:

```http
GET /api/v1/bookings/another-user-id
```

and see another customer's information.

Backend checks:

```text
authenticatedUser.id === booking.userId
```

or approved secure guest-access mechanism.

Admin access is role-based.

---

# 70. Email Queue Payload

Do not place the entire booking document into a queue unless necessary.

Prefer:

```json
{
  "notificationType": "BOOKING_CONFIRMED",
  "bookingId": "booking_id",
  "recipient": "john@example.com",
  "idempotencyKey": "BOOKING_CONFIRMED:booking_id"
}
```

Worker fetches current safe data.

For historical transactional emails, use booking snapshots where required so later CMS changes do not alter historical transactional information.

---

# 71. Email Provider Abstraction

Use an interface such as:

```ts
interface EmailProvider {
  send(input: SendEmailInput): Promise<SendEmailResult>;
}
```

Implementation:

```text
EmailService
  └── Resend / SES / SendGrid / other provider
```

Provider should be replaceable without rewriting booking logic.

---

# 72. Transactional vs CMS Emails

Transactional emails:

```text
booking
payment
refund
cancellation
reminder
```

must be controlled by backend business logic.

CMS/admin should manage template content, but must not be able to bypass transactional state validation.

---

# 73. Notification Preferences

If user preferences are implemented, they may control non-essential communication.

However:

```text
booking confirmation
payment receipt
cancellation
refund
```

are transactional and should not be treated as ordinary marketing notifications.

---

# 74. Email Retry Policy

Recommended:

```text
Attempt 1: immediate
Attempt 2: +1 minute
Attempt 3: +5 minutes
Attempt 4: +15 minutes
Attempt 5: +1 hour
```

Exact values may be configured.

After final failure:

```text
FAILED
```

and admin monitoring can surface the problem.

---

# 75. Webhook Retry Safety

Stripe may retry webhook delivery.

Your endpoint must:

```text
verify signature
+
check event ID
+
process idempotently
+
return appropriate HTTP response
```

If processing fails temporarily, returning an appropriate non-success response can allow provider retry, depending on the provider's documented behavior.

---

# 76. Webhook Security

Webhook endpoint must:

- verify Stripe signature
- use raw body where required by Stripe SDK
- reject invalid signatures
- never trust arbitrary event payloads
- avoid logging sensitive data
- use HTTPS in production
- rate-limit appropriately without breaking legitimate provider retries

---

# 77. Booking Status vs Inventory Status

Do not infer inventory state from only one booking.

A room is unavailable when an overlapping active reservation/hold exists.

Example:

```text
Room 101
Booking A: CONFIRMED
Jun 1 → Jun 5

Requested:
Jun 5 → Jun 8
```

Room remains available.

---

# 78. Expired Hold Availability

Example:

```text
Hold:
Jun 10 → Jun 12
expires at 10:00
```

At:

```text
10:01
```

the hold should no longer block new bookings even if the cleanup worker has not yet changed the document to `EXPIRED`.

Therefore availability logic must include expiration timestamp.

---

# 79. Cancellation and Inventory Release

Once a confirmed booking is cancelled:

```text
Booking → CANCELLED
```

its inventory becomes available again according to the cancellation transition.

However, if the cancellation/refund operation is still pending, the booking/payment states must remain internally consistent.

---

# 80. Admin Manual Changes

Admins may need to:

- cancel booking
- check in
- check out
- allocate/change room
- process refund

Every such action must:

1. check authorization
2. validate current state
3. perform operation
4. write audit log
5. trigger required notifications

Do not allow arbitrary database edits from UI.

---

# 81. Room Reassignment

If staff moves a guest from Room 101 to Room 102:

1. Validate Room 102 availability for entire stay.
2. Ensure no conflicting booking/hold/block.
3. Update allocation atomically.
4. Audit old/new room.
5. Optionally notify relevant staff/customer according to policy.

Never allow reassignment into overlapping inventory.

---

# 82. Cancellation During Payment

If customer requests cancellation while payment is processing:

Backend must inspect:

```text
booking status
payment status
Stripe status
hold expiry
```

Possible outcomes:

```text
cancel before payment → cancel/expire booking
payment later succeeds → reconciliation required
payment succeeded → refund/cancellation flow
```

Do not assume the frontend's state is current.

---

# 83. Browser Refresh During Payment

If customer refreshes:

```text
GET booking status
GET payment status
```

The UI should reconstruct state from backend data.

Do not create a new booking automatically.

---

# 84. Duplicate Booking Submission

Customer may double-click:

```text
Pay / Reserve
```

Use an idempotency key for booking creation where appropriate.

Example:

```text
Idempotency-Key: generated-client-operation-id
```

Backend stores/reuses the result for the same authenticated operation within a safe period.

This prevents accidental duplicate bookings.

---

# 85. Duplicate Payment Submission

Stripe PaymentIntent should be reused when possible for the same booking.

Do not create multiple payment records merely because the customer refreshes.

---

# 86. Browser Closed After Payment

If browser closes after successful payment:

```text
Stripe → webhook → backend confirmation
```

The booking should still become confirmed.

Customer should receive email.

This is why backend webhook processing is critical.

---

# 87. Customer Pays But Confirmation Email Fails

Final state:

```text
Booking = CONFIRMED
Payment = PAID
Email = FAILED/RETRYING
```

This is valid.

Email retry continues independently.

---

# 88. Customer Pays But Webhook Is Delayed

Final temporary state:

```text
Booking = PAYMENT_PENDING
Payment = PROCESSING/PENDING
```

Reconciliation/webhook processing later confirms it.

Do not expire a potentially successful payment without checking provider state.

---

# 89. Admin Dashboard Financial Summary

Dashboard may show:

```text
Today's bookings
Upcoming check-ins
Upcoming check-outs
Revenue
Pending payments
Failed payments
Refunds
Occupancy
```

Revenue definitions must be explicitly documented.

For example:

```text
Gross booking value
Paid amount
Refunded amount
Net collected
```

Do not label a number "revenue" unless the accounting meaning is defined.

---

# 90. Testing Matrix

## Availability

- no bookings
- one confirmed booking
- multiple confirmed bookings
- adjacent checkout/check-in
- exact overlap
- partial overlap
- full containment
- room block
- expired hold
- active hold

## Booking

- valid booking
- invalid dates
- unavailable room
- coupon valid
- coupon expired
- coupon usage exhausted
- duplicate submit
- concurrent booking

## Payment

- successful payment
- failed payment
- cancelled PaymentIntent
- delayed webhook
- duplicate webhook
- invalid webhook signature
- Stripe timeout
- DB failure after Stripe success
- retry payment

## Cancellation

- cancellable booking
- non-refundable booking
- partial refund
- full refund
- already cancelled booking
- cancellation after check-in
- duplicate cancellation request

## Email

- confirmation
- payment failure
- cancellation
- refund
- reminder
- provider timeout
- provider failure
- retry
- duplicate notification

---

# 91. Critical Concurrency Tests

### Test 1 — One Room, Two Customers

Setup:

```text
1 physical room
same dates
2 customers
```

Expected:

```text
Customer A = booking/hold succeeds
Customer B = controlled unavailable response
```

Never:

```text
2 confirmed bookings
```

---

### Test 2 — Hold Expiration

Setup:

```text
Room available
Customer A gets hold
hold expires
Customer B books
```

Expected:

```text
B succeeds
```

---

### Test 3 — Duplicate Webhook

Send same Stripe event twice.

Expected:

```text
one payment transition
one booking confirmation
one confirmation email event
```

---

### Test 4 — Refresh During Payment

Expected:

```text
same booking
same PaymentIntent
no duplicate booking
```

---

### Test 5 — Concurrent Admin Cancellation

Two admin requests cancel same booking.

Expected:

```text
one valid state transition
second request receives already-cancelled/idempotent result
```

---

# 92. API Error Codes

Use stable machine-readable codes.

Examples:

```text
INVALID_DATE_RANGE
PAST_CHECKIN_DATE
ROOM_TYPE_NOT_FOUND
RATE_PLAN_NOT_FOUND
ROOM_NOT_AVAILABLE
ROOM_NO_LONGER_AVAILABLE
BOOKING_NOT_FOUND
BOOKING_NOT_CANCELLABLE
INVALID_BOOKING_STATE
PAYMENT_NOT_FOUND
PAYMENT_FAILED
PAYMENT_ALREADY_COMPLETED
REFUND_NOT_ALLOWED
REFUND_ALREADY_PROCESSED
COUPON_INVALID
COUPON_EXPIRED
COUPON_LIMIT_REACHED
HOLD_EXPIRED
UNAUTHORIZED
FORBIDDEN
IDEMPOTENCY_CONFLICT
```

Frontend should use these codes for predictable UI behavior.

---

# 93. Observability

Log structured events for:

```text
bookingId
bookingReference
paymentId
stripePaymentIntentId
stripeEventId
userId
adminUserId
eventType
timestamp
result
errorCode
```

Do not log:

- card numbers
- CVV
- Stripe secret
- passwords
- reset tokens
- unnecessary personal data

---

# 94. Monitoring Alerts

Production monitoring should surface:

- high payment failure rate
- webhook processing failures
- growing email failure queue
- repeated inventory conflicts
- failed refund operations
- stale PAYMENT_PENDING bookings
- worker downtime
- database transaction failures

---

# 95. Reconciliation Jobs

At least periodically identify:

```text
payment pending for too long
confirmed booking without paid payment
paid payment without confirmed booking
refund pending too long
failed notification requiring retry
```

These should be visible to admin/operations.

---

# 96. Data Consistency Rules

The following must never normally occur:

```text
CONFIRMED booking + unpaid payment
```

unless explicitly allowed by an offline/manual-payment workflow.

```text
PAID payment + missing booking
```

```text
two active overlapping allocations for same room
```

```text
REFUNDED payment + duplicate full refund
```

```text
expired hold blocking availability
```

If such states occur because of an external failure, reconciliation must repair them safely.

---

# 97. Transactional Event Ordering

For booking confirmation:

```text
1. Verify payment event
2. Validate payment/booking relationship
3. Update payment
4. Confirm booking
5. Persist audit event
6. Enqueue email
```

Email is downstream of the transaction.

Never:

```text
send email → then confirm booking
```

because an email provider failure should not determine financial state.

---

# 98. State Transition Service

Implement centralized services rather than allowing controllers to mutate status directly.

Example:

```ts
bookingService.confirmBooking(...)
bookingService.cancelBooking(...)
bookingService.expireBooking(...)
bookingService.checkIn(...)
bookingService.checkOut(...)
paymentService.markPaid(...)
paymentService.markFailed(...)
refundService.createRefund(...)
```

This prevents inconsistent transitions across multiple controllers/workers.

---

# 99. Recommended Service Boundaries

```text
AvailabilityService
PricingService
CouponService
InventoryService
BookingService
PaymentService
RefundService
StripeService
NotificationService
EmailService
ReminderService
ReconciliationService
AuditService
```

Controllers should orchestrate requests, not contain the full business rules.

---

# 100. Pseudocode — Create Booking

```ts
async function createBooking(input, user) {
  validateDates(input.checkIn, input.checkOut);

  const result = await db.transaction(async (tx) => {
    const pricing = await pricingService.calculateQuote(tx, input);

    const allocation = await inventoryService.allocateRooms(tx, {
      roomRequests: input.rooms,
      checkIn: input.checkIn,
      checkOut: input.checkOut
    });

    if (!allocation.success) {
      throw new BusinessError("ROOM_NO_LONGER_AVAILABLE");
    }

    const booking = await bookingRepository.create(tx, {
      userId: user?.id,
      status: "HELD",
      holdExpiresAt: addMinutes(now(), HOLD_MINUTES),
      pricingSnapshot: pricing.snapshot,
      guestSnapshot: input.guest
    });

    await bookingItemRepository.createMany(tx, {
      bookingId: booking.id,
      allocations: allocation.rooms
    });

    return booking;
  });

  const paymentIntent =
    await paymentService.createOrReusePaymentIntent(result);

  await bookingService.markPaymentPending(
    result.id,
    paymentIntent.id
  );

  return {
    booking: result,
    paymentIntent
  };
}
```

The exact transaction implementation depends on MongoDB/Mongoose capabilities and deployment architecture.

---

# 101. Pseudocode — Stripe Webhook

```ts
async function handleStripeWebhook(event) {
  const alreadyProcessed =
    await webhookRepository.exists(event.id);

  if (alreadyProcessed) {
    return;
  }

  await webhookRepository.create({
    stripeEventId: event.id,
    type: event.type,
    status: "RECEIVED"
  });

  switch (event.type) {
    case "payment_intent.succeeded":
      await paymentService.handleSucceeded(event);
      break;

    case "payment_intent.payment_failed":
      await paymentService.handleFailed(event);
      break;

    case "payment_intent.canceled":
      await paymentService.handleCanceled(event);
      break;

    case "charge.refunded":
      await refundService.handleRefunded(event);
      break;
  }

  await webhookRepository.markProcessed(event.id);
}
```

The implementation must protect against race conditions between duplicate webhook deliveries.

---

# 102. Pseudocode — Payment Success

```ts
async function handlePaymentSucceeded(event) {
  const paymentIntent = event.data.object;

  const payment = await paymentRepository.findByIntentId(
    paymentIntent.id
  );

  if (!payment) {
    await reconciliationService.flagUnknownPayment(paymentIntent);
    return;
  }

  if (payment.status === "PAID") {
    return;
  }

  await db.transaction(async (tx) => {
    await paymentRepository.markPaid(tx, payment.id);

    const booking = await bookingRepository.findByIdForUpdate(
      tx,
      payment.bookingId
    );

    if (booking.status === "CONFIRMED") {
      return;
    }

    await bookingService.confirmBookingInTransaction(
      tx,
      booking
    );

    await notificationService.enqueueOnce(tx, {
      type: "BOOKING_CONFIRMED",
      bookingId: booking.id,
      idempotencyKey: `BOOKING_CONFIRMED:${booking.id}`
    });
  });
}
```

---

# 103. Pseudocode — Cancellation

```ts
async function cancelBooking(bookingId, actor) {
  const booking = await bookingRepository.findById(bookingId);

  authorizationService.assertCanCancel(actor, booking);

  const policy =
    await cancellationPolicyService.evaluate(booking);

  if (!policy.allowed) {
    throw new BusinessError("BOOKING_NOT_CANCELLABLE");
  }

  const refundAmount = policy.refundAmount;

  await db.transaction(async (tx) => {
    await bookingService.cancelInTransaction(tx, booking);

    await auditService.record(tx, {
      type: "BOOKING_CANCELLED",
      bookingId,
      actorId: actor.id
    });
  });

  if (refundAmount > 0) {
    await refundService.createRefund({
      bookingId,
      amount: refundAmount
    });
  }

  await notificationService.enqueueOnce({
    type: "BOOKING_CANCELLED",
    bookingId,
    idempotencyKey: `BOOKING_CANCELLED:${bookingId}`
  });
}
```

Actual refund timing may be before or after booking cancellation depending on the final financial state machine.

---

# 104. Pseudocode — Hold Expiration

```ts
async function expireHolds() {
  const candidates =
    await bookingRepository.findExpiredHolds();

  for (const booking of candidates) {
    await withSafeLock(`booking:${booking.id}`, async () => {
      const latest =
        await bookingRepository.findById(booking.id);

      if (!latest) return;

      if (!isHoldExpired(latest)) return;

      if (latest.paymentId) {
        const paymentState =
          await paymentService.reconcile(latest.paymentId);

        if (paymentState === "PAID") {
          await bookingService.confirmFromPayment(latest.id);
          return;
        }
      }

      await bookingService.expireBooking(latest.id);
    });
  }
}
```

---

# 105. Testable Invariants

Automated tests should verify:

```text
checkIn < checkOut
```

```text
same physical room cannot have overlapping active inventory reservations
```

```text
checkout date is exclusive
```

```text
expired hold does not block inventory
```

```text
frontend total is never trusted
```

```text
booking confirmation requires verified payment
```

```text
duplicate webhook has no duplicate side effects
```

```text
duplicate booking request is idempotent
```

```text
customer cannot access another customer's booking
```

```text
cancelled booking cannot be cancelled twice
```

```text
full refund cannot exceed captured payment
```

```text
email failure does not change booking/payment state
```

---

# 106. Security Checklist

- [ ] Stripe secret key backend-only
- [ ] Stripe webhook signature verified
- [ ] raw webhook body handled correctly
- [ ] authorization enforced server-side
- [ ] booking ownership checked
- [ ] admin RBAC enforced
- [ ] rate limiting enabled
- [ ] idempotency supported
- [ ] payment amounts server-calculated
- [ ] sensitive data not logged
- [ ] password hashes never exposed
- [ ] reset tokens never logged
- [ ] secure cookies where applicable
- [ ] HTTPS in production
- [ ] CORS restricted
- [ ] input validation applied
- [ ] Mongo queries protected from unsafe operator injection
- [ ] HTML email content safely rendered
- [ ] webhook endpoint protected against invalid signatures

---

# 107. Acceptance Criteria

## Availability

- [ ] correct date overlap logic
- [ ] checkout is exclusive
- [ ] active holds block inventory
- [ ] expired holds do not
- [ ] room blocks are respected
- [ ] inactive rooms are excluded

## Booking

- [ ] authoritative server pricing
- [ ] authoritative inventory validation
- [ ] physical room allocation
- [ ] hold expiration
- [ ] booking state machine
- [ ] duplicate booking protection

## Payment

- [ ] PaymentIntent created server-side
- [ ] correct amount
- [ ] correct currency
- [ ] Stripe webhook verification
- [ ] webhook idempotency
- [ ] payment failure handling
- [ ] payment retry
- [ ] reconciliation

## Refund

- [ ] cancellation policy enforced
- [ ] refund amount calculated server-side
- [ ] refund idempotency
- [ ] payment refund state updated
- [ ] customer notified

## Email

- [ ] booking confirmation
- [ ] payment failure
- [ ] cancellation
- [ ] refund
- [ ] reminder
- [ ] retries
- [ ] idempotency
- [ ] failure monitoring

## Concurrency

- [ ] no double booking
- [ ] safe hold allocation
- [ ] duplicate webhook safe
- [ ] duplicate cancellation safe
- [ ] duplicate booking submission safe

---

# 108. Decisions Required Before Implementation

The following product decisions should be finalized before code is considered production-ready:

1. Exact currency — likely INR, but confirm.
2. Property timezone.
3. Hold duration.
4. Guest checkout vs mandatory login.
5. Maximum booking date window.
6. Minimum/maximum stay rules.
7. Room occupancy rules.
8. Multi-room booking support.
9. Exact cancellation policy.
10. Exact refund policy.
11. Tax rate and tax calculation method.
12. Additional service/booking fees.
13. Coupon rules.
14. Stripe payment methods.
15. Stripe test/live mode rollout.
16. Email provider.
17. Check-in reminder timing.
18. Whether check-in/check-out emails are required.
19. Whether admin receives every transactional email.
20. Room allocation strategy.
21. Whether customers can request a specific room.
22. Manual/offline payment support.
23. Partial payment support.
24. Whether payment is always required online.
25. Whether room reassignment is allowed by admin.

These decisions should be recorded in the project configuration/spec before implementation.

---

# 109. Implementation Order

Recommended implementation sequence:

### Phase 1 — Domain Foundations

- date utilities
- money utilities
- booking states
- payment states
- domain errors
- audit model
- idempotency model

### Phase 2 — Inventory

- room types
- rooms
- availability blocks
- overlap queries
- allocation
- hold creation
- hold expiration

### Phase 3 — Pricing

- rate plans
- nightly pricing
- taxes
- fees
- coupons
- quote endpoint

### Phase 4 — Booking

- booking creation
- booking items
- guest snapshot
- booking reference
- state transitions
- My Bookings

### Phase 5 — Stripe

- PaymentIntent
- client secret
- webhook
- event persistence
- payment state transitions
- reconciliation

### Phase 6 — Cancellation/Refund

- policy engine
- cancellation endpoint
- Stripe refunds
- refund records
- reconciliation

### Phase 7 — Notifications

- notification records
- queue
- email provider
- templates
- confirmation
- failures
- reminders
- retries

### Phase 8 — Admin Operations

- check-in
- check-out
- cancellation
- refund
- room reassignment
- payment visibility
- audit visibility

### Phase 9 — Hardening

- concurrency tests
- webhook tests
- failure recovery
- security testing
- load testing
- observability
- production readiness

---

# 110. Coding-Agent Instructions

Any AI coding agent implementing this project must:

1. Read documents `01` through `06` before modifying transactional code.
2. Treat this document as the source of truth for reservation/payment/email behavior.
3. Do not introduce multi-hotel marketplace logic.
4. Do not introduce vendor/property-owner accounts unless explicitly added later.
5. Do not put Stripe secrets in frontend code.
6. Do not trust frontend pricing.
7. Do not trust frontend availability.
8. Do not confirm bookings from frontend Stripe callbacks alone.
9. Use Stripe webhook verification.
10. Implement webhook idempotency.
11. Implement booking/payment state machines.
12. Centralize state transitions in services.
13. Keep email processing separate from financial transactions.
14. Protect inventory from race conditions.
15. Preserve historical booking snapshots.
16. Use stable machine-readable error codes.
17. Write tests for every critical invariant.
18. Do not silently expand scope.
19. If a requirement is ambiguous, identify it as an open decision instead of inventing a business rule.
20. Do not replace production-grade transactional logic with simplistic CRUD.

---

# 111. Final System Model

The critical transactional system is:

```text
CUSTOMER
   ↓
AVAILABILITY SEARCH
   ↓
ROOM TYPE + RATE PLAN
   ↓
SERVER PRICING
   ↓
FINAL INVENTORY RECHECK
   ↓
ATOMIC ROOM ALLOCATION
   ↓
TEMPORARY HOLD
   ↓
BOOKING
   ↓
STRIPE PAYMENT
   ↓
VERIFIED WEBHOOK
   ↓
PAYMENT = PAID
   ↓
BOOKING = CONFIRMED
   ↓
EMAIL QUEUE
   ↓
CONFIRMATION EMAIL
```

Cancellation:

```text
CONFIRMED
   ↓
CANCELLATION POLICY
   ↓
BOOKING = CANCELLED
   ↓
REFUND IF APPLICABLE
   ↓
PAYMENT REFUND STATE
   ↓
INVENTORY RELEASE
   ↓
CANCELLATION EMAIL
```

Operations:

```text
CONFIRMED
   ↓
CHECKED_IN
   ↓
CHECKED_OUT
```

The implementation is considered correct only when these flows remain consistent under normal usage, duplicate requests, concurrent users, Stripe retries, delayed webhooks, payment failures, email failures, and application restarts.

---

**End of Document**
