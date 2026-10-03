# 03 — USER FLOWS & SYSTEM JOURNEYS

**Project:** Single-Property Reservation & Management Platform  
**Document:** User Flows & System Journeys  
**Status:** Development Baseline  
**Version:** 1.0  
**Companion Documents:** `01_PROJECT_REQUIREMENTS_PRD.md`, `02_SCOPE_AND_ACCEPTANCE.md`

---

# 1. Purpose

This document defines the end-to-end behavior of the platform from the perspective of customers, administrators, the CMS, payment provider, and notification system.

It answers:

> **Who does what, in what order, what does the system validate, what happens next, and what happens when something fails?**

This document is intentionally focused on **flows and state transitions**, not detailed UI design, database schema, or API implementation.

---

# 2. System Actors

## 2.1 Customer / Guest

A person who searches for accommodation, creates an account, makes a reservation, pays, manages their booking, and may complete cancellation/check-in/check-out actions.

## 2.2 Admin

Authorized staff who manage rooms, availability, bookings, customers, payments, check-in/check-out, offers, and operational settings.

## 2.3 CMS Manager / Editor

A user with permission to manage website content such as pages, blogs, FAQs, offers, gallery, and SEO metadata.

Depending on the final RBAC configuration, CMS permissions may belong to the same admin role or a dedicated editor role.

## 2.4 Payment Provider

Stripe processes payment and sends trusted webhook events to the backend.

## 2.5 Email Service

Transactional email provider sends booking and operational notifications.

## 2.6 Background Worker / Scheduler

Processes delayed or asynchronous work such as:
- expiring holds;
- scheduled check-in reminders;
- email delivery jobs;
- other approved background tasks.

---

# 3. High-Level System Flow

```text
                  PUBLIC WEBSITE
                       │
                       │ Book Now / Content
                       ▼
              RESERVATION APPLICATION
                       │
                       ▼
                 SHARED BACKEND
              ┌────────┼─────────┐
              │        │         │
              ▼        ▼         ▼
           MongoDB   Stripe    Email
              │        │         │
              │        ▼         │
              │     Webhook      │
              │        │         │
              └────────┼─────────┘
                       │
                       ▼
                ADMIN PANEL
                       │
                       ▼
                CMS / OPERATIONS
```

The backend is the authoritative layer for:

- availability;
- booking state;
- pricing validation;
- payment state;
- authorization;
- CMS publication state.

---

# 4. Core Customer Journey

```text
Landing Website
      ↓
Book Now
      ↓
Search
      ↓
Select Dates + Guests
      ↓
Availability Results
      ↓
Select Room / Accommodation
      ↓
Select Rate Plan
      ↓
Guest Details
      ↓
Login / Register
      ↓
Review Booking
      ↓
Create Temporary Hold
      ↓
Stripe Payment
      ↓
Stripe Webhook
      ↓
Confirm Booking
      ↓
Confirmation Email
      ↓
My Booking
      ↓
Check-in
      ↓
Stay
      ↓
Check-out
```

---

# 5. Entry Flow from Landing Website

## Trigger

Customer clicks a booking CTA from the separately developed public website.

## Flow

```text
Public Website
      ↓
Book Now
      ↓
Reservation Application
      ↓
Search Form
```

The reservation application may receive optional search parameters from the website.

Examples:

- check-in;
- check-out;
- guests;
- promotional code.

If no valid parameters are supplied, the reservation application shows an empty/default search state.

## Acceptance

- Customer reaches the reservation system successfully.
- Invalid URL/query parameters do not break the application.
- Search values are validated before use.

---

# 6. Availability Search Flow

## Step 1 — Customer enters search criteria

Required:

- check-in;
- check-out;
- occupancy.

Optional:

- number of rooms;
- promo code;
- children, if enabled.

## Step 2 — Frontend validation

Validate:

```text
checkIn exists
checkOut exists
checkOut > checkIn
guest count > 0
```

Invalid input:

```text
Search
  ↓
Validation Error
  ↓
User Corrects Input
```

## Step 3 — Backend availability search

The backend evaluates:

- requested dates;
- room capacity;
- active rooms;
- manual room blocks;
- confirmed bookings;
- active holds;
- rate-plan availability.

## Step 4 — Results

```text
Search Request
      ↓
Validate
      ↓
Query Availability
      ↓
Calculate Applicable Rates
      ↓
Return Available Options
```

## Important Rule

Search results are **not a permanent reservation**.

The selected inventory must be revalidated when the customer proceeds to booking.

---

# 7. Room Selection Flow

```text
Availability Results
        ↓
Open Room Details
        ↓
Review:
- Images
- Description
- Amenities
- Capacity
- Policies
- Price
        ↓
Select Rate Plan
        ↓
Continue
```

If the selected room becomes unavailable before booking:

```text
Continue
   ↓
Availability Recheck
   ↓
Unavailable
   ↓
Show Availability Changed
   ↓
Return to Results
```

The system must never silently replace the selected room with another room.

---

# 8. Rate Plan Selection Flow

Customer selects a rate plan.

Example:

```text
Deluxe Room
 ├── Flexible Rate
 ├── Advance Purchase
 └── Promotional Rate
```

Backend validates:

- rate is active;
- dates are valid;
- rate plan applies to selected room;
- restrictions are satisfied;
- coupon/offer rules are valid.

If invalid:

```text
Rate Selection
      ↓
Backend Validation
      ↓
Invalid / Expired
      ↓
Show Error
      ↓
Refresh Available Rates
```

---

# 9. Guest Details Flow

Customer enters:

- name;
- email;
- phone;
- guest count;
- address/details where required;
- special requests where included.

Frontend performs basic validation.

Backend performs authoritative validation.

```text
Guest Details
      ↓
Client Validation
      ↓
Backend Validation
      ↓
Booking Summary
```

---

# 10. Authentication Flow

## 10.1 Existing User

```text
Booking
  ↓
Login
  ↓
Email + Password
  ↓
Authenticate
  ↓
Return to Booking
```

The selected booking/search context should be preserved.

## 10.2 New User

```text
Booking
  ↓
Register
  ↓
Account Created
  ↓
Authenticated
  ↓
Return to Booking
```

## 10.3 Forgot Password

```text
Forgot Password
      ↓
Enter Email
      ↓
Backend Creates Secure Reset Token
      ↓
Email Sent
      ↓
Reset Link
      ↓
New Password
      ↓
Password Updated
      ↓
Login
```

## Security Rules

- Reset tokens expire.
- Reset tokens are single-use.
- Passwords are never stored in plain text.
- Authentication errors should not expose unnecessary account information.

---

# 11. Booking Review Flow

Before payment the customer sees:

- property/accommodation;
- room;
- rate plan;
- check-in;
- check-out;
- guests;
- nightly price;
- discounts;
- taxes/fees where configured;
- final amount;
- cancellation policy;
- guest information.

Flow:

```text
Guest Details
      ↓
Backend Price Recalculation
      ↓
Availability Recheck
      ↓
Booking Summary
      ↓
Customer Confirmation
```

The frontend must not be allowed to alter the authoritative final price.

---

# 12. Temporary Hold Flow

When the customer proceeds to payment:

```text
Booking Intent
      ↓
Final Availability Check
      ↓
Create Temporary Hold
      ↓
Create Payment Session/Intent
      ↓
Payment
```

The hold has an expiration time.

## Successful payment

```text
Hold
 ↓
Payment
 ↓
Webhook Verified
 ↓
Booking Confirmed
 ↓
Hold Converted to Reservation
```

## Failed payment

```text
Hold
 ↓
Payment Failed
 ↓
Booking Remains Unconfirmed
 ↓
Hold Released
 ↓
Inventory Available Again
```

## Abandoned payment

```text
Hold
 ↓
No Payment
 ↓
Hold Expires
 ↓
Inventory Released
```

A background worker should process expired holds.

---

# 13. Stripe Payment Flow

```text
Customer
   ↓
Booking Summary
   ↓
Backend Creates Stripe Payment Context
   ↓
Stripe Checkout / Payment UI
   ↓
Customer Pays
   ↓
Stripe Processes Payment
   ↓
Stripe Webhook
   ↓
Verify Signature
   ↓
Verify Event/Payment
   ↓
Update Payment
   ↓
Confirm Booking
   ↓
Send Confirmation Email
```

## Critical rule

Frontend redirect/callback is only a UX signal.

The backend must rely on a verified Stripe webhook/payment state before treating the payment as confirmed.

---

# 14. Stripe Payment Success Flow

```text
Payment Successful
       ↓
Webhook Received
       ↓
Signature Valid?
   ┌───┴────┐
  No       Yes
  ↓         ↓
Reject   Verify Payment
            ↓
        Payment Valid?
          ┌─┴─┐
         No  Yes
         ↓    ↓
       Fail  Mark Paid
              ↓
         Confirm Booking
              ↓
         Reduce/Reserve Inventory
              ↓
         Send Emails
```

Duplicate webhook events must be idempotent.

---

# 15. Stripe Payment Failure Flow

```text
Payment Attempt
      ↓
Stripe Failure
      ↓
Payment = FAILED
      ↓
Booking not confirmed
      ↓
Hold released/retained temporarily
      ↓
Customer sees payment failure
      ↓
Retry or return to search
```

The exact retry/hold policy is configurable but must not permit accidental double booking.

---

# 16. Booking Confirmation Flow

After verified successful payment:

```text
Payment Verified
      ↓
Booking Confirmed
      ↓
Generate Booking Reference
      ↓
Persist Booking
      ↓
Persist Payment
      ↓
Release/convert temporary hold
      ↓
Create Notification Jobs
      ↓
Customer Confirmation Email
      ↓
Admin New Booking Email
```

Customer sees:

- confirmation status;
- booking reference;
- accommodation;
- dates;
- guests;
- price;
- payment status;
- property information.

---

# 17. Booking Reference

Each confirmed booking receives a unique human-readable booking reference.

Example:

```text
ABC-2026-000123
```

The actual format is configurable.

Requirements:

- unique;
- non-sensitive;
- easy to communicate;
- searchable by admin;
- displayed in confirmation email.

---

# 18. My Bookings Flow

```text
Login
 ↓
My Bookings
 ↓
Upcoming / Past
 ↓
Select Booking
 ↓
Booking Details
```

Customer can see:

- booking reference;
- dates;
- room;
- guests;
- payment;
- status;
- cancellation eligibility.

---

# 19. Customer Cancellation Flow

```text
My Booking
      ↓
Cancel Booking
      ↓
Display Cancellation Policy
      ↓
Customer Confirms
      ↓
Backend Validates Eligibility
      ↓
Cancel Booking
      ↓
Release Inventory
      ↓
Refund if applicable
      ↓
Update Payment/Refund Status
      ↓
Send Cancellation Email
```

If cancellation is not allowed:

```text
Cancel Request
      ↓
Policy Check
      ↓
Not Eligible
      ↓
Show Policy Message
      ↓
Booking Remains Active
```

---

# 20. Admin Cancellation Flow

Admin:

```text
Admin
 ↓
Reservations
 ↓
Open Booking
 ↓
Cancel Booking
 ↓
Select/enter reason
 ↓
Backend policy/action validation
 ↓
Cancel
 ↓
Refund where applicable
 ↓
Release inventory
 ↓
Notification
```

Administrative cancellation must be auditable.

---

# 21. Check-in Flow

Check-in is an operational admin action.

```text
Confirmed Booking
      ↓
Guest Arrives
      ↓
Admin Opens Booking
      ↓
Validate Booking/Date
      ↓
Mark CHECKED_IN
      ↓
Record Timestamp/User
      ↓
Send Check-in Email
```

The exact date restriction should be configurable according to property operations.

If an admin tries an invalid transition:

```text
Already Checked Out
      ↓
Check-in Attempt
      ↓
Reject
```

---

# 22. Check-out Flow

```text
CHECKED_IN
     ↓
Guest Checks Out
     ↓
Admin Opens Booking
     ↓
Mark CHECKED_OUT
     ↓
Record Timestamp/User
     ↓
Release operational room status
     ↓
Send Check-out Email
```

A checked-out booking should remain in history.

---

# 23. Check-in Reminder Flow

Example policy:

```text
Check-in Date
      ↓
Configured Reminder Time
      ↓
Background Scheduler
      ↓
Find Eligible Confirmed Bookings
      ↓
Create Email Job
      ↓
Send Reminder
```

The reminder must not be sent if the booking is already cancelled.

If a reminder job fails, retry according to email-job policy.

---

# 24. Admin Login Flow

```text
Admin Login
    ↓
Credentials
    ↓
Authenticate
    ↓
Load Role/Permissions
    ↓
Authorized?
 ┌──┴──┐
No    Yes
 ↓      ↓
Reject Dashboard
```

Every protected admin operation must be authorized server-side.

Frontend route protection alone is insufficient.

---

# 25. Admin Dashboard Flow

```text
Admin Login
    ↓
Dashboard
    ↓
Fetch Summary
    ├── Bookings
    ├── Check-ins
    ├── Check-outs
    ├── Payments
    └── Availability
```

Dashboard is informational and must not bypass normal business rules.

---

# 26. Room Management Flow

## Create Room Type

```text
Admin
 ↓
Room Types
 ↓
Create
 ↓
Enter Details
 ↓
Validate
 ↓
Save
 ↓
Room Type Available for Configuration
```

## Create Physical Room

```text
Admin
 ↓
Rooms
 ↓
Create Room
 ↓
Assign Room Type
 ↓
Set Room Number/Name
 ↓
Save
```

A room cannot be bookable without valid required configuration.

---

# 27. Room Disable Flow

```text
Admin
 ↓
Open Room
 ↓
Disable
 ↓
Check Active/Future Reservations
```

If future bookings exist, the system must prevent destructive deletion.

Possible behavior:

```text
Disable from future availability
```

while preserving historical records.

---

# 28. Availability Block Flow

Admin can manually block a room.

```text
Admin
 ↓
Availability Calendar
 ↓
Select Room
 ↓
Select Dates
 ↓
Block
 ↓
Enter Optional Reason
 ↓
Save
```

Blocked dates must not be returned as bookable inventory.

---

# 29. Availability Unblock Flow

```text
Admin
 ↓
Calendar
 ↓
Select Block
 ↓
Unblock
 ↓
Validate Conflicting Booking/Hold
 ↓
Remove Block
```

Unblocking must not create an overlap with existing reservations.

---

# 30. Admin Reservation Search Flow

Admin can search by:

- booking reference;
- customer;
- email;
- phone where applicable;
- date;
- status;
- room.

```text
Search Criteria
      ↓
Backend Query
      ↓
Filtered Results
      ↓
Open Reservation
```

---

# 31. Customer Management Flow

```text
Admin
 ↓
Customers
 ↓
Search/List
 ↓
Customer Profile
 ↓
Booking History
```

Admin should not have access to raw payment-card details.

---

# 32. Payment Management Flow

```text
Admin
 ↓
Payments
 ↓
Transaction List
 ↓
Open Transaction
 ↓
View:
- Booking
- Amount
- Status
- Stripe Reference
- Refund Status
```

Payment status should be based on trusted backend/provider information.

---

# 33. Coupon Creation Flow

```text
Admin
 ↓
Coupons
 ↓
Create
 ↓
Code
 ↓
Discount
 ↓
Validity
 ↓
Usage Rules
 ↓
Save
 ↓
Enable
```

Customer application:

```text
Enter Coupon
 ↓
Backend Validates
 ↓
Valid?
 ┌─┴─┐
No Yes
↓    ↓
Error Apply Discount
```

---

# 34. CMS Content Lifecycle

General flow:

```text
Admin/Editor
     ↓
Create Content
     ↓
DRAFT
     ↓
Edit/Preview
     ↓
Publish
     ↓
PUBLIC API
     ↓
Landing Website
```

Archive:

```text
PUBLISHED
    ↓
ARCHIVE
    ↓
Removed from normal public listings
```

---

# 35. CMS Page Flow

```text
CMS
 ↓
Pages
 ↓
Create/Edit Page
 ↓
Content
 ↓
SEO Metadata
 ↓
Save Draft
 ↓
Review
 ↓
Publish
```

Published content becomes available through the public CMS API.

---

# 36. Blog Publishing Flow

```text
Create Article
      ↓
Draft
      ↓
Add:
- Title
- Slug
- Content
- Image
- SEO
      ↓
Publish
      ↓
Public Blog API
```

Duplicate slugs must be rejected or safely resolved according to the chosen slug policy.

---

# 37. FAQ Management Flow

```text
Admin
 ↓
FAQs
 ↓
Create Question/Answer
 ↓
Set Order
 ↓
Publish
 ↓
Public FAQ API
```

---

# 38. Offer Management Flow

```text
Admin
 ↓
Offers
 ↓
Create Offer
 ↓
Configure:
- Title
- Description
- Image
- Dates
- CTA
- Optional booking relationship
 ↓
Publish
 ↓
Public API
```

Offer content and booking discounts are separate concepts unless explicitly linked.

---

# 39. Media Flow

```text
Admin
 ↓
Upload Media
 ↓
Media Provider
 ↓
Store URL/Key + Metadata
 ↓
Associate with Content
 ↓
Publish Content
```

The application stores media references/metadata rather than raw large files in MongoDB.

---

# 40. SEO Content Flow

```text
Editor
 ↓
Page/Blog/Room
 ↓
SEO Fields
 ↓
Save
 ↓
Publish
 ↓
Public API
 ↓
Landing Website Uses Metadata
```

SEO fields do not automatically guarantee search-engine indexing; the public website remains responsible for rendering/indexing behavior.

---

# 41. Email Notification Flow

General pattern:

```text
Business Event
      ↓
Backend Event
      ↓
Create Notification Job
      ↓
Email Worker
      ↓
Email Provider
      ↓
Delivery / Failure
```

Examples:

```text
Booking Confirmed → Confirmation Email
Booking Cancelled → Cancellation Email
Check-in - 24h → Reminder Email
CHECKED_IN → Check-in Email
CHECKED_OUT → Check-out Email
```

Email sending must not block critical booking transactions unnecessarily.

---

# 42. Email Failure Flow

```text
Business Event
      ↓
Email Job
      ↓
Provider Failure
      ↓
Retry
      ↓
Retry Limit
      ↓
Failed Notification Record
```

A failed email must not:

- cancel a successful booking;
- reverse a successful payment;
- make a confirmed booking unconfirmed.

---

# 43. Payment + Email Dependency Rule

Correct:

```text
Payment Webhook
      ↓
Confirm Booking
      ↓
Queue Email
```

Incorrect:

```text
Payment Webhook
      ↓
Wait for Email
      ↓
Confirm Booking
```

Email delivery is a downstream notification, not the source of truth for booking confirmation.

---

# 44. Expired Hold Flow

```text
Temporary Hold
      ↓
Expiration Time Reached
      ↓
Background Worker
      ↓
Check Booking/Payment State
      ↓
Still Unpaid?
 ┌────┴────┐
Yes       No
 ↓         ↓
Expire   Keep Valid
Hold
 ↓
Release Inventory
```

If payment has already succeeded, the hold must not be expired.

---

# 45. Double Booking Prevention Flow

```text
Search
 ↓
Room Appears Available
 ↓
Customer Selects
 ↓
Final Availability Check
 ↓
Temporary Hold / Atomic Reservation
 ↓
Payment
 ↓
Confirmation
```

If two customers attempt the same room simultaneously:

```text
Customer A ──┐
              ├── Final Atomic Availability Check
Customer B ──┘
                    ↓
              Only one succeeds
```

The loser receives an availability/booking conflict response and should be returned to updated results.

---

# 46. Concurrent Payment Flow

Possible situation:

```text
Customer A → Hold Room
Customer B → Attempts Same Room
```

Backend must ensure:

- only valid inventory can be held;
- hold expiration is respected;
- duplicate booking is impossible;
- payment for a released/invalid reservation cannot create an invalid confirmed booking.

---

# 47. Invalid Booking Flow

Examples:

- Room no longer available
- Rate expired
- Coupon invalid
- Price changed
- Booking hold expired
- Payment failed
- Session expired

General behavior:

```text
Invalid Condition
      ↓
Stop Current Action
      ↓
Do Not Create Invalid Confirmation
      ↓
Show Clear User Message
      ↓
Provide Safe Next Action
```

The system must not silently continue with stale data.

---

# 48. Session Expiry Flow

```text
User Session Expires
      ↓
Protected Request
      ↓
Authentication Failure
      ↓
Redirect to Login
      ↓
Preserve safe navigation context where possible
```

Sensitive payment/booking data must not be exposed while unauthenticated.

---

# 49. Unauthorized Admin Action

```text
Admin
 ↓
Restricted Action
 ↓
Backend Permission Check
 ↓
Unauthorized
 ↓
Reject
 ↓
Audit if appropriate
```

Frontend hiding a button is not sufficient authorization.

---

# 50. CMS Permission Flow

Example:

```text
Editor
 ↓
Edit CMS
 ↓
Permission Check
 ↓
Allowed
 ↓
Save Draft
```

Publishing may require a higher permission depending on final RBAC.

Example:

```text
Editor → Draft
Admin → Publish
```

This is configurable and must be finalized before implementation.

---

# 51. Complete Booking Lifecycle

```text
SEARCH
  ↓
SELECT ROOM
  ↓
SELECT RATE
  ↓
GUEST DETAILS
  ↓
AUTHENTICATION
  ↓
REVIEW
  ↓
HELD
  ↓
PAYMENT_PENDING
  ↓
PAYMENT
  ↓
WEBHOOK VERIFIED
  ↓
CONFIRMED
  ↓
CHECKED_IN
  ↓
CHECKED_OUT
```

Alternative branches:

```text
HELD → EXPIRED
PAYMENT_PENDING → FAILED
CONFIRMED → CANCELLED
CANCELLED → REFUNDED / NO_REFUND
```

---

# 52. Complete Cancellation Lifecycle

```text
CONFIRMED
    ↓
Cancellation Request
    ↓
Policy Validation
    ↓
Eligible?
 ┌──┴──┐
No    Yes
 ↓      ↓
Reject Cancel
        ↓
 Release Inventory
        ↓
 Refund if applicable
        ↓
 Update Payment
        ↓
 Send Notification
```

---

# 53. Complete CMS Lifecycle

```text
Create
 ↓
Draft
 ↓
Edit
 ↓
Validate
 ↓
Publish
 ↓
Public API
 ↓
Landing Website
```

Content can later be:

```text
Published → Archived
```

---

# 54. End-to-End Operational Journey

The complete business lifecycle is:

```text
                  PUBLIC WEBSITE
                       │
                       ▼
                  BOOK NOW
                       │
                       ▼
                RESERVATION APP
                       │
                 Search Rooms
                       │
                 Select Rate
                       │
                 Guest Details
                       │
                    Login
                       │
                 Review Price
                       │
                 Temporary Hold
                       │
                    STRIPE
                       │
                Webhook Verify
                       │
                 CONFIRM BOOKING
                       │
              ┌────────┴────────┐
              ▼                 ▼
        CUSTOMER EMAIL      ADMIN EMAIL
              │                 │
              ▼                 ▼
          MY BOOKING       ADMIN PANEL
                                │
                        ┌───────┼────────┐
                        ▼       ▼        ▼
                    CHECK-IN CHECK-OUT CMS
                                        │
                                        ▼
                                  PUBLIC WEBSITE
```

---

# 55. Critical Flow Rules

The following rules are non-negotiable:

1. Search availability is not a reservation.
2. Final availability must be rechecked before booking.
3. A room must not be double-booked.
4. Temporary holds must expire.
5. Payment status and booking status are separate.
6. Frontend payment success is not final payment confirmation.
7. Stripe webhook must be verified.
8. Webhook processing must be idempotent.
9. Email failure must not corrupt booking/payment state.
10. Customer can access only their own bookings.
11. Admin authorization is enforced by backend.
12. Historical bookings must not be destroyed by room/content changes.
13. CMS drafts must not appear as published public content.
14. Archived CMS content should not appear in normal public listings.
15. Client-provided price values are not trusted by the backend.
16. Cancellation must follow configured policy.
17. Refund status must be tracked separately.
18. Check-in/check-out transitions must be valid.
19. Important administrative actions should be auditable.
20. Production secrets must never be exposed to the frontend.

---

# 56. Flow-Level Acceptance Checklist

## Customer

- [ ] Customer can reach booking system from landing website.
- [ ] Customer can search availability.
- [ ] Customer can select room.
- [ ] Customer can select rate.
- [ ] Customer can register/login.
- [ ] Customer can review final price.
- [ ] Customer can complete Stripe payment.
- [ ] Booking is confirmed only after trusted payment verification.
- [ ] Confirmation email is sent.
- [ ] Customer can view booking.
- [ ] Customer can cancel when eligible.
- [ ] Customer receives cancellation/refund notification.
- [ ] Customer receives check-in reminder.
- [ ] Customer receives check-in/check-out notifications.

## Admin

- [ ] Admin can authenticate.
- [ ] Admin can view dashboard.
- [ ] Admin can manage rooms.
- [ ] Admin can manage rates.
- [ ] Admin can manage availability.
- [ ] Admin can manage bookings.
- [ ] Admin can manage customers.
- [ ] Admin can view payments.
- [ ] Admin can perform check-in.
- [ ] Admin can perform check-out.
- [ ] Admin can manage coupons/offers.
- [ ] Admin can manage CMS.

## CMS

- [ ] Content can be drafted.
- [ ] Content can be published.
- [ ] Content can be archived.
- [ ] Public API returns published content.
- [ ] SEO metadata is available.
- [ ] Blog flow works.
- [ ] FAQ flow works.
- [ ] Gallery flow works.
- [ ] Offer flow works.

## System

- [ ] Double booking is prevented.
- [ ] Expired holds are released.
- [ ] Stripe webhook is verified.
- [ ] Duplicate webhooks are safe.
- [ ] Email failures do not corrupt transactions.
- [ ] Unauthorized access is blocked.
- [ ] Critical business rules are server-side.

---

# 57. Dependencies for Next Documents

These flows establish requirements for:

### `04_SYSTEM_ARCHITECTURE.md`
Must define:
- application boundaries;
- services;
- queues/workers;
- payment integration;
- notification architecture;
- authentication architecture.

### `05_DATABASE_AND_API_SPEC.md`
Must model:
- booking states;
- payment states;
- room inventory;
- holds;
- rate plans;
- CMS publication;
- notification records;
- audit events.

### `06_RESERVATION_PAYMENT_EMAIL.md`
Must formalize:
- availability algorithm;
- booking state machine;
- hold mechanism;
- Stripe flow;
- webhook idempotency;
- refund flow;
- email events;
- scheduled reminders.

### `07_ADMIN_AND_CMS_SPEC.md`
Must translate these journeys into exact screens, permissions, actions, tables, forms, and CMS operations.

---

# 58. Open Decisions Before Implementation

The following business decisions should be confirmed before the related implementation begins:

1. Is guest checkout allowed, or must every booking use an account?
2. Exact temporary hold duration.
3. Children/infant age rules.
4. Maximum occupancy rules.
5. Exact cancellation windows.
6. Refund policy.
7. Tax/fee calculation rules.
8. Whether taxes are included in displayed prices.
9. Whether multiple rooms can be booked in one transaction.
10. Exact rate-plan restrictions.
11. Check-in reminder timing.
12. Exact check-in/check-out operational restrictions.
13. Whether admin/editor roles are separate.
14. Whether CMS publishing requires approval.
15. Exact coupon applicability rules.
16. Email provider.
17. Stripe checkout vs Stripe Payment Element/other approved integration mode.
18. Property timezone.
19. Currency.
20. Whether reviews are actually included in the first release.

These decisions should be recorded in the PRD or implementation configuration before dependent features are finalized.

---

# 59. Document Governance

This document describes the expected system journeys.

When a flow changes:

1. Update this document.
2. Check PRD impact.
3. Check scope/acceptance impact.
4. Check architecture impact.
5. Check database/API impact.
6. Update implementation plan.
7. Only then implement the changed behavior.

**End of User Flows & System Journeys**
