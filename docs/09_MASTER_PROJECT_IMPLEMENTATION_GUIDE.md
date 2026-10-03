# 09_MASTER_PROJECT_IMPLEMENTATION_GUIDE.md

# Master Project Specification & Implementation Guide

**Project:** Single-Property Hotel Reservation & Management Platform  
**Document:** 09 — Master / Final Overall Specification  
**Status:** Final Development Baseline  
**Purpose:** Single source of truth for development, integration, QA, deployment and AI coding agents

---

# 1. Document Purpose

This is the final overall document for the project.

It consolidates the architectural and functional direction established across documents `01` through `08`.

Use this document to understand:

- what is being built
- what is not being built
- how all applications connect
- how users move through the system
- how reservations work
- how rooms are modeled
- how payments work
- how emails work
- how the admin panel works
- how CMS works
- how authentication works at a high level
- what the recommended codebase structure is
- what implementation order should be followed
- what rules must never be violated
- how the final system should be tested
- what "done" means

This document is intentionally an **overall coordination document**.

Detailed behavior remains in the specialized documents:

```text
01_PROJECT_REQUIREMENTS_PRD.md
02_SCOPE_AND_ACCEPTANCE.md
03_USER_FLOWS.md
04_SYSTEM_ARCHITECTURE.md
05_DATABASE_AND_API_SPEC.md
06_RESERVATION_PAYMENT_EMAIL.md
07_ADMIN_MANAGEMENT_SPEC.md
08_CMS_AND_CONTENT_SPEC.md
09_MASTER_PROJECT_IMPLEMENTATION_GUIDE.md
```

The specialized document should be consulted whenever this master document is not detailed enough for an implementation decision.

---

# 2. Executive Summary

The system is a **single-property hotel reservation platform**.

There is:

```text
1 Property
   ↓
Multiple Room Types
   ↓
Multiple Physical Rooms
   ↓
Rate Plans
   ↓
Customer Reservations
   ↓
Stripe Payments
   ↓
Email Notifications
```

The platform has three primary application surfaces:

```text
1. Public Website
   Built/managed by the client/company

2. Customer Reservation App
   Booking/search/payment/account experience

3. Management/Admin App
   Hotel operational and CMS management
```

All applications communicate with a shared:

```text
Express + MongoDB backend
```

Supporting infrastructure:

```text
Redis
Stripe
Email Provider
Cloudinary/S3
Background Workers
```

---

# 3. Most Important Scope Clarification

This project is **not**:

- a hotel marketplace
- a multi-property booking platform
- an OTA
- a Booking.com clone
- an Airbnb clone
- a vendor marketplace
- a property-owner SaaS
- a channel manager
- a POS/accounting platform

There is one hotel/property.

That property has multiple physical rooms.

The customer books a room type/rate for dates.

The backend allocates a physical room.

---

# 4. Responsibility Split

## 4.1 Client/Company Builds

The client/company is responsible for the public marketing website frontend.

Examples:

```text
Homepage
About
Property presentation
Marketing sections
Visual storytelling
Public navigation
```

The public website consumes CMS data from the backend where applicable.

---

## 4.2 Development Scope

The development scope covers:

### Customer Reservation Application

- availability search
- room/rate selection
- guest details
- booking
- temporary hold
- Stripe checkout
- confirmation
- My Bookings
- cancellation
- account functionality

### Management Application

- dashboard
- reservations
- rooms
- rates
- availability
- customers
- payments
- refunds
- coupons
- check-in/out
- CMS
- media
- settings
- audit logs
- admin users

### Backend

- Express API
- authentication
- authorization
- reservation logic
- inventory
- pricing
- payments
- Stripe webhook
- refunds
- CMS
- notifications
- background jobs
- audit logging

---

# 5. Recommended Technology Stack

## Frontend

```text
React
TypeScript
Tailwind CSS
shadcn/ui
React Router
TanStack Query or project-approved server-state solution
Zod or equivalent validation
Stripe.js
```

Use the existing project conventions if already established.

---

## Backend

```text
Node.js
Express
TypeScript
MongoDB
Mongoose
Redis
Stripe SDK
Email provider SDK
Cloudinary/S3 SDK
```

---

## Infrastructure

```text
Application hosting
MongoDB
Redis
Stripe
Cloudinary/S3
Email provider
Background worker
HTTPS
Logging/monitoring
```

Exact hosting provider can be finalized separately.

---

# 6. Recommended Repository Structure

A monorepo-style structure is recommended:

```text
project/
│
├── apps/
│   │
│   ├── website/
│   │   └── client-managed-public-site
│   │
│   ├── reservation/
│   │   └── React customer booking application
│   │
│   └── management/
│       └── React admin/management application
│
├── server/
│   │
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── validators/
│   │   ├── jobs/
│   │   ├── workers/
│   │   ├── integrations/
│   │   │   ├── stripe/
│   │   │   ├── email/
│   │   │   └── media/
│   │   ├── utils/
│   │   └── types/
│   │
│   └── tests/
│
├── shared/
│   ├── types/
│   ├── constants/
│   ├── schemas/
│   └── utilities/
│
├── docs/
│   ├── 01_PROJECT_REQUIREMENTS_PRD.md
│   ├── 02_SCOPE_AND_ACCEPTANCE.md
│   ├── 03_USER_FLOWS.md
│   ├── 04_SYSTEM_ARCHITECTURE.md
│   ├── 05_DATABASE_AND_API_SPEC.md
│   ├── 06_RESERVATION_PAYMENT_EMAIL.md
│   ├── 07_ADMIN_MANAGEMENT_SPEC.md
│   ├── 08_CMS_AND_CONTENT_SPEC.md
│   └── 09_MASTER_PROJECT_IMPLEMENTATION_GUIDE.md
│
└── README.md
```

The exact folder structure may vary, but the domain boundaries should remain.

---

# 7. Application Relationship

Overall architecture:

```text
                         ┌────────────────────────┐
                         │ Client Public Website  │
                         │ Marketing / SEO        │
                         └───────────┬────────────┘
                                     │
                            Published CMS API
                                     │
                                     ▼
┌──────────────────────┐     ┌────────────────────────┐
│ Customer Reservation │────▶│                        │
│ React Application    │     │                        │
└──────────────────────┘     │                        │
                             │   Express Backend      │
┌──────────────────────┐     │                        │
│ Management/Admin     │────▶│ Reservation Domain     │
│ React Application    │     │ Payment Domain         │
└──────────────────────┘     │ CMS Domain             │
                             │ Auth Domain             │
                             │ Notification Domain     │
                             └──────┬───────┬─────────┘
                                    │       │
                           ┌────────┘       └────────┐
                           ▼                         ▼
                      ┌─────────┐               ┌─────────┐
                      │ MongoDB │               │ Redis   │
                      └─────────┘               └─────────┘
                           │                         │
                           │                         │
                           ▼                         ▼
                      ┌─────────┐               Background
                      │ Stripe  │               Workers
                      └─────────┘                   │
                                                   ▼
                                              Email Provider
```

Media:

```text
Admin
  ↓
Backend
  ↓
Cloudinary/S3
  ↓
Media URL
  ↓
CMS
  ↓
Public Website
```

---

# 8. Core Domain Modules

Backend should be organized around domains.

Recommended:

```text
Auth
Users
Admin
Property
Room Types
Rooms
Rate Plans
Availability
Pricing
Coupons
Bookings
Booking Items
Payments
Refunds
Stripe
Notifications
Email
CMS
Media
Settings
Audit Logs
Reconciliation
```

Avoid putting everything into generic controllers.

---

# 9. Core Data Model

High-level relationships:

```text
Property
   │
   ├── Room Types
   │      │
   │      ├── Physical Rooms
   │      └── Rate Plans
   │
   ├── Availability Blocks
   │
   └── Site/Property Settings
```

Bookings:

```text
User
  │
  └── Booking
        │
        ├── Booking Items
        │      ├── Room Type Snapshot
        │      ├── Rate Snapshot
        │      └── Physical Room Allocation
        │
        └── Payment
              └── Refund(s)
```

CMS:

```text
CMS Page
 ├── Sections
 ├── Media
 ├── SEO
 └── Published State

Blog
FAQ
Offer
Room Content
Property Content
Policy
Media
Site Settings
```

---

# 10. Physical Inventory Model

The most important inventory concept is:

```text
Room Type != Physical Room
```

Example:

```text
Deluxe Room
  ├── Room 101
  ├── Room 102
  ├── Room 103
  └── Room 104
```

Customers generally book:

```text
Deluxe Room + Flexible Rate
```

The backend allocates:

```text
Room 101
```

or another available physical room.

---

# 11. Availability Rule

The core overlap rule is:

```text
existingCheckIn < requestedCheckOut
AND
existingCheckOut > requestedCheckIn
```

Check-out is exclusive.

Example:

```text
Existing:
June 7 → June 10

Requested:
June 10 → June 12
```

Result:

```text
AVAILABLE
```

---

# 12. Availability Sources

Inventory availability must consider:

```text
Confirmed bookings
Active temporary holds
Availability blocks
Room status
```

Expired holds must not permanently block inventory.

---

# 13. Search vs Final Booking

Availability search is not authoritative.

Correct flow:

```text
Search
  ↓
Show available room/rate
  ↓
Customer selects
  ↓
Backend recalculates price
  ↓
Backend rechecks inventory
  ↓
Atomic allocation/hold
  ↓
Payment
```

The backend must perform the final check.

---

# 14. Temporary Hold

Before payment:

```text
room → HELD
```

for a limited period.

Recommended starting configuration:

```text
10–15 minutes
```

Exact duration is configurable.

If payment is not completed:

```text
HELD → EXPIRED
```

Inventory becomes available again.

---

# 15. Booking State Machine

Primary lifecycle:

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

Alternative branches:

```text
HELD → EXPIRED
PAYMENT_PENDING → EXPIRED
CONFIRMED → CANCELLED
```

Invalid state transitions must be rejected.

---

# 16. Payment State Machine

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

Booking status and payment status must remain separate.

---

# 17. Pricing Architecture

The backend calculates:

```text
nightly rates
+
fees
+
taxes
-
discounts
=
final amount
```

Example:

```text
Night 1: ₹4,000
Night 2: ₹4,500
Night 3: ₹4,000

Subtotal: ₹12,500
Discount: ₹1,000
Tax: ₹2,070

Total: ₹13,570
```

The exact tax/fee rules must be finalized.

---

# 18. Historical Booking Snapshot

At booking time, preserve:

```text
room type name
rate plan name
nightly rates
discount
tax
fees
total
currency
guest details required for the transaction
```

Future admin changes must not modify old booking totals.

---

# 19. Money Rules

Use integer minor units.

Example:

```text
₹1,250.50
→ 125050
```

Do not rely on JavaScript floating-point arithmetic for financial calculations.

Centralize money operations.

---

# 20. Stripe Architecture

Recommended flow:

```text
Customer
   ↓
Create Booking
   ↓
Server creates PaymentIntent
   ↓
Client receives clientSecret
   ↓
Stripe payment UI
   ↓
Customer pays
   ↓
Stripe webhook
   ↓
Backend verifies signature
   ↓
Payment = PAID
   ↓
Booking = CONFIRMED
```

Stripe secret key remains backend-only.

---

# 21. Stripe Webhook Rules

Webhook processing must:

1. verify signature
2. use the raw request body correctly
3. identify the event
4. detect duplicates
5. persist event information
6. process safely
7. update payment/booking
8. create notification event
9. return appropriate response

Important events include:

```text
payment_intent.succeeded
payment_intent.payment_failed
payment_intent.canceled
charge.refunded
```

---

# 22. Webhook Idempotency

Stripe may send the same event more than once.

Example:

```text
event_123
event_123
event_123
```

Expected:

```text
one financial transition
one booking confirmation
one confirmation notification
```

Use stored `stripeEventId`.

---

# 23. Payment Reconciliation

The system must handle:

```text
Stripe success + DB failure
DB pending + Stripe success
webhook delayed
webhook processing failure
application restart
```

A reconciliation worker should identify mismatches.

Never assume the browser is the source of truth.

---

# 24. Cancellation

Cancellation must be controlled by structured policy.

Possible:

```text
Free cancellation
Partial refund
Non-refundable
```

The backend calculates the actual refund.

CMS policy text must not replace structured cancellation rules.

---

# 25. Refund

Refund lifecycle:

```text
Booking cancellation
      ↓
Calculate refundable amount
      ↓
Create Stripe refund
      ↓
Persist refund
      ↓
Update payment
      ↓
Audit
      ↓
Notify customer
```

Refund amount cannot exceed refundable captured payment.

Refund requests must be idempotent.

---

# 26. Check-In / Check-Out

Authorized staff:

```text
CONFIRMED
    ↓
CHECKED_IN
    ↓
CHECKED_OUT
```

Record:

```text
actor
timestamp
```

No housekeeping/POS/maintenance system is included unless separately scoped.

---

# 27. Email Architecture

Transactional email should be event-driven.

```text
Booking Event
   ↓
Notification Service
   ↓
Queue
   ↓
Email Worker
   ↓
Email Provider
```

Required/important events:

```text
Booking received
Payment confirmed
Payment failed
Booking confirmed
Booking cancelled
Refund update
Check-in reminder
Check-in/check-out where required
Admin booking alerts
```

---

# 28. Email Failure Rule

Email failure must never change financial state.

Example:

```text
Booking = CONFIRMED
Payment = PAID
Email = FAILED
```

This is a valid temporary state.

Retry independently.

---

# 29. Authentication

Customer authentication should support, depending on finalized requirements:

```text
Register
Login
Logout
Forgot Password
Reset Password
Protected Account
My Bookings
```

Admin authentication is separate in authorization scope even if the underlying auth infrastructure is shared.

Recommended session approach:

```text
HTTP-only secure cookies
```

Exact implementation should follow the final backend architecture.

---

# 30. Authorization

Backend authorization is mandatory.

Customer:

```text
can access own bookings
```

Admin:

```text
can access records according to permissions
```

Editor:

```text
CMS-focused
```

Manager:

```text
operational
```

Super Admin:

```text
full administrative access
```

Frontend route guards are UX, not security.

---

# 31. Admin Application

Core sections:

```text
Dashboard
Reservations
Rooms
Rates
Availability
Customers
Payments
Refunds
Coupons
CMS
Media
Settings
Audit Logs
Admin Users
```

Every section should be permission-aware.

---

# 32. Dashboard

Recommended metrics:

```text
Today's arrivals
Today's departures
Current guests
Upcoming reservations
Pending payments
Payment failures
Booking value
Occupancy
```

Financial labels must have clear definitions.

---

# 33. Reservation Management

Admin must be able to:

```text
Search
Filter
View
Cancel
Check in
Check out
Inspect payment
Process refund if authorized
Reassign room if authorized
```

Every mutation must use backend business rules.

---

# 34. Room Management

Admin can manage:

```text
Room Types
Physical Rooms
Room status
Availability blocks
Availability calendar
```

Room statuses may include:

```text
ACTIVE
OUT_OF_SERVICE
INACTIVE
```

---

# 35. Rate Management

Admin can manage:

```text
Rate Plans
Nightly prices
Cancellation policy
Meal inclusion
Minimum stay
Maximum stay
Booking window
Active dates
```

Inactive rates cannot be newly booked.

Existing bookings preserve their snapshot.

---

# 36. Customer Management

Admin can:

```text
Search customers
View profiles
View booking history
View account status
```

Never expose:

```text
password
authentication secrets
card data
```

---

# 37. Payment Management

Admin can inspect:

```text
Payment status
Amount
Currency
Booking
Stripe reference
Failure
Refunds
```

Refund capability is permission-controlled.

---

# 38. CMS

CMS supports:

```text
Pages
Blogs
FAQs
Offers
Room Content
Property Content
Policies
Media
SEO
Site Settings
```

Content lifecycle:

```text
DRAFT
  ↓
PUBLISHED
  ↓
ARCHIVED
```

---

# 39. CMS Section Model

Recommended structured sections:

```text
HERO
EDITORIAL_TEXT
SPLIT_CONTENT
IMAGE_GALLERY
ROOM_SHOWCASE
FEATURE_GRID
OFFER_CARD
FAQ
TESTIMONIALS
LOCATION
CTA
CONTACT
```

Do not turn the CMS into an unrestricted generic page builder unless separately approved.

---

# 40. CMS/Public Website Relationship

The public website is client-managed.

It consumes:

```text
published CMS APIs
```

Example:

```http
GET /api/v1/public/pages/about-us
```

Only published content should be returned.

Drafts remain private.

---

# 41. CMS Security

CMS must protect against:

```text
XSS
unsafe URLs
stored script injection
draft leakage
internal data leakage
malicious media
```

Rich text must be sanitized.

CTA URLs must be validated.

---

# 42. Media

Media should be stored in:

```text
Cloudinary
or
S3
```

MongoDB stores metadata.

Metadata:

```text
URL
storageKey
filename
mimeType
width
height
size
altText
caption
```

---

# 43. SEO

CMS can manage:

```text
SEO title
Meta description
Canonical
OG title
OG description
OG image
Robots
```

The public website is responsible for rendering:

```text
meta tags
Open Graph
structured data
sitemap
robots.txt
canonical tags
```

---

# 44. Public API

Public APIs should expose only safe published data.

Examples:

```text
GET /api/v1/public/pages/:slug
GET /api/v1/public/blogs
GET /api/v1/public/blogs/:slug
GET /api/v1/public/faqs
GET /api/v1/public/offers
GET /api/v1/public/room-types
GET /api/v1/public/property
GET /api/v1/public/site-settings
```

---

# 45. Customer API

Core customer endpoints:

```text
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/forgot-password
POST /auth/reset-password

GET /availability
POST /bookings/quote
POST /bookings
GET /bookings
GET /bookings/:id
POST /bookings/:id/cancel

POST /payments/create-intent
POST /payments/retry
```

Exact endpoint naming must follow document 05.

---

# 46. Admin API

Core areas:

```text
/admin/dashboard
/admin/reservations
/admin/rooms
/admin/room-types
/admin/rates
/admin/availability
/admin/customers
/admin/payments
/admin/refunds
/admin/coupons
/admin/cms
/admin/media
/admin/settings
/admin/audit-logs
/admin/admin-users
```

---

# 47. Database Collections

Recommended core collections:

```text
users
adminUsers
properties
roomTypes
rooms
ratePlans
availabilityBlocks
bookings
bookingItems
payments
refunds
coupons
cmsPages
blogs
faqs
offers
media
siteSettings
emailTemplates
notifications
auditLogs
webhookEvents
```

Exact schema is defined in document 05.

---

# 48. Database Rules

Important:

- use stable IDs
- preserve historical snapshots
- index query-critical fields
- validate state transitions
- avoid unnecessary duplication
- use transactions/atomic operations where required
- maintain audit records for sensitive operations

---

# 49. Redis Responsibilities

Redis may be used for:

```text
temporary room holds
distributed locks
rate limiting
cache
background queues
short-lived tokens
```

Redis must not be treated as the permanent source of truth for reservations.

MongoDB remains the persistent transactional source of truth.

---

# 50. Background Workers

Recommended workers:

```text
Hold Expiration
Email
Payment Reconciliation
Notification
Reminder
```

Small deployments may run multiple handlers in one worker process.

---

# 51. Critical Race Condition

Scenario:

```text
1 room
2 customers
same dates
```

Both see:

```text
available
```

Only one may successfully create the final hold/allocation.

The second must receive:

```text
ROOM_NO_LONGER_AVAILABLE
```

Never allow:

```text
double confirmed booking
```

---

# 52. Idempotency Requirements

Use idempotency for:

```text
booking creation
payment processing
Stripe webhook events
refunds
notifications
scheduled reminders
```

Duplicate requests must not create duplicate financial or reservation side effects.

---

# 53. Security Baseline

Must have:

```text
HTTPS
Secure cookies
HTTP-only cookies where applicable
Password hashing
Rate limiting
Input validation
RBAC
Webhook signature verification
CORS restrictions
Secret management
Audit logging
Sensitive-data redaction
```

Never store/log:

```text
card number
CVV
password
Stripe secret
JWT secret
reset token
```

---

# 54. Error Handling

Use machine-readable error codes.

Examples:

```text
INVALID_DATE_RANGE
ROOM_NO_LONGER_AVAILABLE
HOLD_EXPIRED
BOOKING_NOT_FOUND
BOOKING_NOT_CANCELLABLE
INVALID_BOOKING_STATE
PAYMENT_FAILED
PAYMENT_ALREADY_COMPLETED
REFUND_ALREADY_PROCESSED
COUPON_INVALID
COUPON_EXPIRED
UNAUTHORIZED
FORBIDDEN
IDEMPOTENCY_CONFLICT
CONTENT_NOT_FOUND
CONTENT_VERSION_CONFLICT
```

Frontend converts these into user-friendly messages.

---

# 55. Logging

Structured logs should include where appropriate:

```text
requestId
userId
adminUserId
bookingId
bookingReference
paymentId
stripePaymentIntentId
stripeEventId
eventType
result
errorCode
timestamp
```

Never log secrets or unnecessary sensitive personal data.

---

# 56. Audit Logging

Audit sensitive events:

```text
booking cancellation
refund
check-in
check-out
room reassignment
rate change
room change
CMS publication
settings change
admin user change
permission change
```

Audit records should be append-oriented.

---

# 57. Caching

Good cache candidates:

```text
published CMS pages
published blogs
FAQs
site settings
room metadata
```

Be careful caching:

```text
inventory
booking status
payment status
```

Final booking validation must never depend solely on cache.

---

# 58. Environment Configuration

Example:

```text
NODE_ENV
PORT

MONGODB_URI
REDIS_URL

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PUBLISHABLE_KEY

EMAIL_API_KEY
EMAIL_FROM

CLOUDINARY_URL
or
S3 credentials

SESSION_SECRET / auth secrets
APP_URL
PUBLIC_SITE_URL
RESERVATION_APP_URL
MANAGEMENT_APP_URL
```

Secrets must be stored securely.

Never commit production secrets.

---

# 59. Deployment Architecture

Generic production model:

```text
Public Website
      │
      ▼
CDN / Hosting
      │
      ▼
Reservation App ──────┐
                      │
Management App ───────┤
                      ▼
                Express API
                 │       │
                 ▼       ▼
              MongoDB   Redis
                 │
                 ▼
             Workers
             │     │
             ▼     ▼
          Stripe  Email
```

Media:

```text
Cloudinary/S3
```

---

# 60. Development Environments

Recommended:

```text
local
staging
production
```

Stripe:

```text
test mode
→ staging validation
→ live mode
```

Do not use production payment credentials locally.

---

# 61. CI/CD

Recommended pipeline:

```text
Pull Request
   ↓
Lint
   ↓
Typecheck
   ↓
Unit Tests
   ↓
Integration Tests
   ↓
Build
   ↓
Security checks
   ↓
Deploy staging
   ↓
Smoke tests
   ↓
Production deployment
```

The exact CI provider is flexible.

---

# 62. Testing Pyramid

## Unit

Test:

```text
pricing
date calculations
overlap
coupon rules
state transitions
permissions
SEO validation
CMS validation
```

## Integration

Test:

```text
database
booking
inventory
Stripe
webhook
email queue
CMS APIs
authentication
```

## End-to-End

Test:

```text
customer booking
payment
confirmation
cancellation
admin check-in
admin check-out
CMS publication
```

---

# 63. Critical End-to-End Test

Complete booking:

```text
Customer opens reservation app
        ↓
Searches dates
        ↓
Selects room/rate
        ↓
Enters guest details
        ↓
Server recalculates price
        ↓
Server allocates/holds room
        ↓
Stripe PaymentIntent
        ↓
Customer pays
        ↓
Webhook verified
        ↓
Payment PAID
        ↓
Booking CONFIRMED
        ↓
Email queued
        ↓
Confirmation email sent
        ↓
Booking appears in My Bookings
        ↓
Admin sees booking
```

This flow must work without manual database intervention.

---

# 64. Critical Cancellation Test

```text
Confirmed booking
        ↓
Customer/Admin cancels
        ↓
Backend checks policy
        ↓
Refund calculated
        ↓
Booking cancelled
        ↓
Stripe refund
        ↓
Payment updated
        ↓
Inventory released
        ↓
Audit recorded
        ↓
Cancellation email
```

---

# 65. Critical Concurrency Test

Setup:

```text
one physical room
same date range
two customers
```

Expected:

```text
Customer A → succeeds
Customer B → controlled availability conflict
```

Final database:

```text
one active allocation
```

Never:

```text
two overlapping confirmed bookings
```

---

# 66. Critical Webhook Test

Send:

```text
payment_intent.succeeded
```

twice.

Expected:

```text
payment = PAID once
booking = CONFIRMED once
email = queued once
audit = appropriate event once/idempotently
```

---

# 67. Critical Failure Recovery Test

Scenario:

```text
Stripe payment succeeds
database update fails
```

Expected:

```text
reconciliation identifies mismatch
```

Then:

```text
payment state recovered
booking state safely reconciled
```

No duplicate charge/refund.

---

# 68. Performance Priorities

Priority order:

```text
1. Correctness
2. Security
3. Data consistency
4. Reliability
5. User experience
6. Performance optimization
```

Do not sacrifice inventory/payment correctness for minor performance improvements.

---

# 69. UX Principles

Customer app:

```text
simple
clear
fast
mobile-friendly
trustworthy checkout
clear pricing
clear dates
clear cancellation policy
clear confirmation
```

Management app:

```text
operational
dense but readable
fast search
clear statuses
safe destructive actions
clear financial information
```

CMS:

```text
simple editor
clear draft/publish state
safe media handling
preview before publish
```

---

# 70. Status Badges

Use consistent status semantics.

Booking:

```text
DRAFT
HELD
PAYMENT_PENDING
CONFIRMED
CHECKED_IN
CHECKED_OUT
EXPIRED
CANCELLED
```

Payment:

```text
PENDING
PROCESSING
PAID
FAILED
REFUNDED
PARTIALLY_REFUNDED
```

Content:

```text
DRAFT
PUBLISHED
ARCHIVED
```

Do not invent additional states without updating the domain specification.

---

# 71. Out-of-Scope Features

The following are explicitly excluded unless separately approved:

```text
Multi-property marketplace
Property-owner/vendor portal
OTA/channel manager
Booking.com integration
Airbnb integration
Expedia integration
POS
Accounting ERP
Payroll
Housekeeping system
Maintenance management system
Advanced revenue management
AI dynamic pricing
Native mobile apps
Loyalty platform
Referral platform
Gift cards
Advanced BI/data warehouse
Full marketing automation
Full newsletter platform
Multi-site CMS
Enterprise DAM
Advanced localization framework
```

Adding any of these requires scope review.

---

# 72. Change Request Rule

Any new feature must be classified as:

```text
Bug
or
Change Request
```

A bug is:

```text
implemented agreed behavior does not work as specified
```

A change request is:

```text
new behavior
new screen
new integration
new workflow
new business rule
```

Do not silently absorb change requests into existing development.

---

# 73. AI Coding-Agent Master Rules

Any AI coding agent working on this project must follow these rules:

## Rule 1

Read the relevant project documents before coding.

## Rule 2

Do not invent missing business rules.

If unclear:

```text
identify as open decision
```

## Rule 3

Do not change the architecture casually.

## Rule 4

Do not introduce multi-hotel functionality.

## Rule 5

Do not turn the system into a marketplace.

## Rule 6

Do not trust frontend availability.

## Rule 7

Do not trust frontend pricing.

## Rule 8

Do not confirm booking solely from frontend payment callback.

## Rule 9

Stripe webhook verification is mandatory.

## Rule 10

Webhook processing must be idempotent.

## Rule 11

Payment and booking states remain separate.

## Rule 12

Inventory allocation must be concurrency-safe.

## Rule 13

Email failure must not corrupt booking/payment state.

## Rule 14

Backend authorization is mandatory.

## Rule 15

CMS cannot control reservation pricing by itself.

## Rule 16

Historical booking data must remain stable.

## Rule 17

Do not expose secrets.

## Rule 18

Do not expose sensitive internal fields through public APIs.

## Rule 19

Every important mutation needs validation and appropriate audit logging.

## Rule 20

Do not replace domain services with huge controller functions.

---

# 74. Recommended Backend Layering

Use:

```text
Route
  ↓
Controller
  ↓
Validation
  ↓
Authorization
  ↓
Service
  ↓
Repository
  ↓
Database
```

External integrations:

```text
Service
  ↓
Integration Adapter
  ↓
Stripe / Email / Media
```

Background processing:

```text
Domain Event / Job
  ↓
Queue
  ↓
Worker
  ↓
Service
```

---

# 75. Controller Responsibilities

Controllers should:

- parse request
- call validation
- invoke service
- format response

Controllers should not contain:

- complex pricing
- room allocation algorithms
- refund rules
- Stripe reconciliation
- CMS business rules

---

# 76. Service Responsibilities

Services contain business logic.

Examples:

```text
AvailabilityService
PricingService
BookingService
InventoryService
PaymentService
RefundService
CMSService
NotificationService
```

This makes rules reusable across:

```text
customer API
admin API
workers
webhooks
```

---

# 77. Repository Responsibilities

Repositories handle persistence:

```text
find
create
update
delete/archive
query
aggregation
transaction operations
```

Do not put UI/business decisions inside repositories.

---

# 78. Shared Types

Share safe types between frontend/backend where practical:

```text
BookingStatus
PaymentStatus
ContentStatus
Role
Permission
API error codes
Public DTOs
```

Avoid sharing raw database models directly with frontend.

---

# 79. API Versioning

Use:

```text
/api/v1
```

from the beginning.

This allows future evolution without breaking existing clients.

---

# 80. API Response Pattern

Recommended:

```json
{
  "success": true,
  "data": {},
  "message": null,
  "error": null
}
```

Error:

```json
{
  "success": false,
  "data": null,
  "error": {
    "code": "ROOM_NO_LONGER_AVAILABLE",
    "message": "The selected room is no longer available."
  }
}
```

Pagination:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 100,
    "totalPages": 4
  }
}
```

Exact contract must remain consistent with document 05.

---

# 81. Final Product Flow

## Customer

```text
Public Website
      ↓
Book Now
      ↓
Reservation App
      ↓
Search Availability
      ↓
Choose Room + Rate
      ↓
Guest Details
      ↓
Review Price
      ↓
Temporary Hold
      ↓
Stripe
      ↓
Payment
      ↓
Verified Webhook
      ↓
Booking Confirmed
      ↓
Email
      ↓
My Bookings
```

---

# 82. Hotel Staff

```text
Management Login
      ↓
Dashboard
      ↓
Reservations
      ↓
Today's Arrivals
      ↓
Check-In
      ↓
Guest Stay
      ↓
Check-Out
```

---

# 83. Admin Operations

```text
Dashboard
   ↓
Rooms / Inventory
   ↓
Rates
   ↓
Reservations
   ↓
Customers
   ↓
Payments / Refunds
   ↓
CMS
   ↓
Settings
   ↓
Audit Logs
```

---

# 84. Content Team

```text
Management App
      ↓
CMS
      ↓
Create Draft
      ↓
Edit
      ↓
Preview
      ↓
Publish
      ↓
Public CMS API
      ↓
Client Website
```

---

# 85. Production Readiness Checklist

## Architecture

- [ ] applications separated logically
- [ ] backend domain boundaries implemented
- [ ] shared types established
- [ ] environment configuration complete

## Database

- [ ] schemas complete
- [ ] indexes complete
- [ ] transactions/atomic operations tested
- [ ] backup strategy configured

## Authentication

- [ ] customer authentication
- [ ] admin authentication
- [ ] secure sessions
- [ ] password reset
- [ ] RBAC
- [ ] account disable behavior

## Reservation

- [ ] availability
- [ ] overlap logic
- [ ] physical room allocation
- [ ] temporary holds
- [ ] expiration
- [ ] state machine
- [ ] cancellation

## Payments

- [ ] Stripe test mode
- [ ] PaymentIntent
- [ ] webhook
- [ ] signature verification
- [ ] idempotency
- [ ] refunds
- [ ] reconciliation
- [ ] live mode validation

## Email

- [ ] provider configured
- [ ] templates
- [ ] queue
- [ ] retries
- [ ] reminders
- [ ] failure monitoring

## Admin

- [ ] dashboard
- [ ] reservations
- [ ] rooms
- [ ] rates
- [ ] availability
- [ ] customers
- [ ] payments
- [ ] refunds
- [ ] CMS
- [ ] audit logs

## CMS

- [ ] pages
- [ ] blogs
- [ ] FAQs
- [ ] offers
- [ ] room content
- [ ] media
- [ ] SEO
- [ ] publishing
- [ ] public APIs

## Security

- [ ] HTTPS
- [ ] secrets protected
- [ ] RBAC
- [ ] input validation
- [ ] XSS protection
- [ ] rate limiting
- [ ] CORS
- [ ] webhook verification
- [ ] sensitive logs removed

## Testing

- [ ] unit tests
- [ ] integration tests
- [ ] E2E booking
- [ ] E2E cancellation
- [ ] concurrency
- [ ] duplicate webhook
- [ ] payment failure
- [ ] email failure
- [ ] CMS security
- [ ] authorization

---

# 86. Launch Checklist

Before production:

```text
1. Finalize business decisions
2. Configure production environment
3. Configure MongoDB
4. Configure Redis
5. Configure Stripe
6. Configure Stripe webhook
7. Configure email provider
8. Configure media provider
9. Seed property
10. Seed room types
11. Create physical rooms
12. Create rate plans
13. Configure cancellation rules
14. Configure taxes/fees
15. Create admin users
16. Add CMS content
17. Configure SEO
18. Run full test suite
19. Run production smoke tests
20. Verify payment flow
21. Verify webhook
22. Verify email
23. Verify booking/cancellation
24. Verify admin operations
25. Verify backups
26. Enable monitoring
27. Deploy
```

---

# 87. Post-Launch Monitoring

Monitor:

```text
API errors
5xx rate
booking failures
availability conflicts
payment failures
Stripe webhook failures
refund failures
email failures
queue backlog
worker health
MongoDB health
Redis health
response times
```

Operational alerts should be actionable.

---

# 88. Backup & Recovery

At minimum:

```text
MongoDB backup
environment configuration backup
CMS/media backup strategy
audit retention
Stripe reconciliation capability
```

Media stored externally should have its own retention/recovery strategy.

Test recovery periodically.

---

# 89. Business Continuity Principle

If an external service fails:

### Stripe unavailable

Do not confirm payment.

Keep booking state safe and retry/reconcile.

### Email unavailable

Booking/payment continue normally.

Retry email separately.

### Redis unavailable

Do not blindly proceed with unsafe inventory logic if Redis is required for locking/holds. The system should fail safely or use a database-safe fallback.

### Media provider unavailable

CMS/media upload may fail, but existing bookings should remain unaffected.

---

# 90. Final Architecture Principles

The project should always prioritize:

```text
Correctness
Security
Consistency
Reliability
Maintainability
Clear domain boundaries
Simple operational workflows
```

Avoid:

```text
unnecessary abstraction
over-engineering
generic marketplace logic
frontend-only business rules
duplicated state machines
unsafe shortcuts
```

---

# 91. Final Scope Statement

The final system is:

> A production-oriented, single-property hotel reservation and management platform with a React customer booking application, React management application, Express/MongoDB backend, Redis-supported inventory coordination, Stripe payments, transactional email, and a structured CMS consumed by a separately built public website.

The system supports:

```text
Single Property
+
Multiple Room Types
+
Multiple Physical Rooms
+
Rate Plans
+
Availability
+
Reservations
+
Temporary Holds
+
Stripe Payments
+
Refunds
+
Customer Accounts
+
Admin Management
+
CMS
+
Media
+
SEO
+
Email Notifications
+
Audit Logs
```

It does not include marketplace or multi-property functionality.

---

# 92. Final "Do Not Break" Rules

These are the most important rules in the entire project:

```text
1. One property only.

2. Physical rooms are the actual inventory.

3. Room type and physical room are different entities.

4. Checkout date is exclusive.

5. Availability search is not final availability.

6. Final availability is checked server-side.

7. Temporary holds protect inventory during checkout.

8. Holds expire.

9. Double booking must be prevented atomically.

10. Pricing is calculated server-side.

11. Frontend totals are never trusted.

12. Booking status and payment status are separate.

13. Stripe webhook is authoritative for payment confirmation.

14. Stripe webhooks must be idempotent.

15. Refunds must be idempotent.

16. Email failure must not corrupt booking/payment state.

17. Backend authorization is mandatory.

18. Historical booking pricing must remain unchanged.

19. CMS content must not control financial rules.

20. Draft CMS content must never leak through public APIs.

21. Secrets must never be exposed to frontend/public APIs.

22. Sensitive operations must be audited.

23. AI agents must not invent missing business rules.

24. New functionality that changes scope must be treated as a change request.

25. Production correctness is more important than shortcut implementation.
```

---

# 93. Recommended Development Sequence

The complete development should proceed in this order:

```text
STEP 1
Project setup
React apps
Express server
MongoDB
Redis
shared types

        ↓

STEP 2
Authentication
Customer auth
Admin auth
RBAC

        ↓

STEP 3
Property
Room Types
Physical Rooms
Rate Plans

        ↓

STEP 4
Availability
Overlap logic
Room blocks
Inventory allocation

        ↓

STEP 5
Pricing
Quotes
Taxes
Fees
Coupons

        ↓

STEP 6
Booking
Temporary holds
Booking state machine
My Bookings

        ↓

STEP 7
Stripe
PaymentIntent
Checkout
Webhook
Idempotency

        ↓

STEP 8
Cancellation
Refunds
Reconciliation

        ↓

STEP 9
Email
Notifications
Queue
Reminder
Retries

        ↓

STEP 10
Admin
Dashboard
Reservations
Rooms
Rates
Payments
Customers
Operations

        ↓

STEP 11
CMS
Pages
Blogs
FAQs
Offers
Media
SEO
Publishing

        ↓

STEP 12
Audit
Monitoring
Security
Performance

        ↓

STEP 13
Full testing

        ↓

STEP 14
Staging

        ↓

STEP 15
Production
```

Do not start by building every frontend screen first.

Build the domain foundations and backend contracts first.

---

# 94. Definition of Final Completion

The project can be considered functionally complete when a real customer can:

```text
Open website
    ↓
Enter reservation flow
    ↓
Search dates
    ↓
See available room types
    ↓
Select rate
    ↓
Enter guest information
    ↓
Receive accurate price
    ↓
Temporarily hold inventory
    ↓
Pay with Stripe
    ↓
Receive confirmation
    ↓
See booking in account
    ↓
Cancel according to policy
    ↓
Receive refund where applicable
```

And hotel staff can:

```text
Log into Management
    ↓
See booking
    ↓
Manage inventory
    ↓
Manage rates
    ↓
Check guest in
    ↓
Check guest out
    ↓
View payment
    ↓
Process authorized refund
    ↓
Manage CMS
    ↓
Manage media
    ↓
Review audit history
```

And the client website can:

```text
Consume published CMS content
    ↓
Render pages
    ↓
Render room/property content
    ↓
Render offers/blogs/FAQs
    ↓
Render SEO metadata
    ↓
Send customers into reservation flow
```

---

# 95. Final AI-Agent Prompt

When handing the complete project to an AI coding agent, use this instruction:

```text
You are implementing a production-oriented single-property hotel reservation and management platform.

Before changing code, read all project specification documents:

01_PROJECT_REQUIREMENTS_PRD.md
02_SCOPE_AND_ACCEPTANCE.md
03_USER_FLOWS.md
04_SYSTEM_ARCHITECTURE.md
05_DATABASE_AND_API_SPEC.md
06_RESERVATION_PAYMENT_EMAIL.md
07_ADMIN_MANAGEMENT_SPEC.md
08_CMS_AND_CONTENT_SPEC.md
09_MASTER_PROJECT_IMPLEMENTATION_GUIDE.md

Treat these documents as the project source of truth.

The project is NOT a multi-hotel marketplace.

There is exactly one property with multiple physical rooms.

The system consists of:

1. Client-managed public website
2. React customer reservation application
3. React management/admin application
4. Express backend
5. MongoDB
6. Redis
7. Stripe
8. Email provider
9. External media storage
10. Background workers

Implement the system using clear domain boundaries.

Do not build a generic CRUD application.

Do not put business logic inside React components.

Do not put complex business logic inside controllers.

Use services for domain rules.

Use repositories for persistence.

Validate all requests.

Enforce authorization on the backend.

Treat physical rooms as actual inventory.

Use the documented date overlap rule:

existingCheckIn < requestedCheckOut
AND
existingCheckOut > requestedCheckIn

Check-out is exclusive.

Never trust frontend availability.

Never trust frontend pricing.

Recalculate pricing on the backend.

Use temporary inventory holds.

Prevent concurrent double booking.

Keep booking status and payment status separate.

Use Stripe PaymentIntent.

Never expose Stripe secret keys.

Use verified Stripe webhooks as the authoritative payment confirmation mechanism.

Make webhook handling idempotent.

Make booking creation idempotent where appropriate.

Make refunds idempotent.

Keep financial state independent from email delivery.

Use background workers for email/reminders/reconciliation.

Preserve historical booking snapshots.

Implement cancellation/refund rules as backend business logic.

CMS content must never directly control reservation pricing or refund behavior.

Only published CMS content may be exposed through normal public APIs.

Sanitize rich text.

Validate URLs.

Protect against XSS.

Keep audit logs for sensitive operations.

Do not expose passwords, secrets, card information, reset tokens, or internal sensitive fields.

Do not invent requirements.

If an important behavior is not specified, stop and identify the decision needed instead of silently creating a new business rule.

Do not add out-of-scope marketplace, OTA, POS, housekeeping, accounting, loyalty, native-app, or advanced revenue-management features.

Build in phases.

After each phase:

1. typecheck
2. lint
3. run relevant tests
4. verify API contracts
5. verify database behavior
6. verify authorization
7. verify error handling
8. document any unresolved decision

For every critical transactional flow, write automated tests.

Prioritize:

correctness > security > consistency > reliability > UX > optimization.

The final implementation must match the specification rather than merely looking complete in the UI.
```

---

# 96. Final Project Checklist

```text
[ ] Scope understood
[ ] Single-property architecture confirmed
[ ] React reservation app
[ ] React management app
[ ] Express backend
[ ] MongoDB
[ ] Redis
[ ] Customer authentication
[ ] Admin authentication
[ ] RBAC
[ ] Property
[ ] Room types
[ ] Physical rooms
[ ] Rate plans
[ ] Availability
[ ] Room blocks
[ ] Pricing
[ ] Taxes
[ ] Fees
[ ] Coupons
[ ] Quotes
[ ] Temporary holds
[ ] Booking lifecycle
[ ] Stripe PaymentIntent
[ ] Stripe webhook
[ ] Webhook idempotency
[ ] Payment failure handling
[ ] Cancellation
[ ] Refunds
[ ] Refund idempotency
[ ] Payment reconciliation
[ ] Email queue
[ ] Email templates
[ ] Check-in reminder
[ ] Admin dashboard
[ ] Reservation management
[ ] Customer management
[ ] Payment management
[ ] Check-in
[ ] Check-out
[ ] Room reassignment
[ ] CMS pages
[ ] Blogs
[ ] FAQs
[ ] Offers
[ ] Room content
[ ] Property content
[ ] Policies
[ ] Media
[ ] SEO
[ ] Draft/Preview/Publish
[ ] Public CMS API
[ ] Cache invalidation
[ ] Audit logs
[ ] Security hardening
[ ] Unit tests
[ ] Integration tests
[ ] E2E tests
[ ] Concurrency tests
[ ] Staging
[ ] Production configuration
[ ] Monitoring
[ ] Backup/recovery
[ ] Final acceptance
```

---

# 97. Final Statement

This document set should be treated as the project's development baseline.

The specialized documents define detailed requirements.

This master document defines how those requirements fit together.

The implementation should remain:

```text
Single-property
Domain-driven
API-first
Transactional
Secure
Auditable
Scalable enough for the expected workload
Simple enough to maintain
```

The goal is not to build the largest possible hotel platform.

The goal is to build the agreed reservation, payment, management and CMS system correctly, with clear boundaries and reliable production behavior.

---

**END OF FINAL MASTER DOCUMENT**
