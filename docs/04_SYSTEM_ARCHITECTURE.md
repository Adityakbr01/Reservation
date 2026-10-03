# 04 — SYSTEM ARCHITECTURE SPECIFICATION

**Project:** Single-Property Reservation & Management Platform  
**Document:** System Architecture  
**Status:** Development Baseline  
**Version:** 1.0  
**Companion Documents:**  
- `01_PROJECT_REQUIREMENTS_PRD.md`
- `02_SCOPE_AND_ACCEPTANCE.md`
- `03_USER_FLOWS.md`

---

# 1. Architecture Purpose

This document defines the technical architecture of the platform and how its major components communicate.

The architecture must support:

- one hotel/property;
- multiple room/accommodation types;
- multiple physical rooms;
- multiple rate plans;
- customer reservation;
- secure payment;
- real-time booking validation;
- management operations;
- CMS;
- transactional email;
- future extensibility without turning the system into a multi-hotel marketplace.

The objective is a **structured, maintainable production application**, not a collection of disconnected frontend pages.

---

# 2. Architecture Principles

The system follows these principles:

1. **Single source of truth:** Business-critical state lives in the backend.
2. **Backend authority:** Pricing, availability, booking, permissions and payment state are never trusted from the browser.
3. **Clear application boundaries:** Reservation, admin and public CMS consumers have separate frontend responsibilities.
4. **Shared backend:** All applications use the same backend/domain rules.
5. **Atomic booking:** Inventory allocation must protect against concurrent booking.
6. **Payment confirmation through trusted provider events:** Stripe webhooks are authoritative for payment confirmation.
7. **Asynchronous notifications:** Email should not block critical booking transactions.
8. **Idempotency:** Payment and event processing must safely handle duplicates.
9. **Auditability:** Important operational/admin changes should be traceable.
10. **Security by default:** Authentication and authorization are enforced server-side.
11. **Content separation:** CMS content is separate from transactional booking data.
12. **Provider abstraction:** External services should be replaceable without rewriting the domain layer.
13. **Production observability:** Errors, jobs and critical events should be diagnosable.
14. **No accidental multi-property complexity:** Property-specific functionality should remain simple while allowing future extension if explicitly required.

---

# 3. Recommended Technology Baseline

## Frontend

- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query or an equivalent server-state solution
- Form validation using an agreed schema library

Optional:

- GSAP or another animation library only where it provides real UX value.

## Backend

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose

## Infrastructure / Supporting Services

Recommended:

- Redis
- Background worker / queue
- Stripe
- Transactional email provider
- Cloudinary or S3-compatible media storage

The exact hosting provider can be selected separately.

---

# 4. High-Level Architecture

```text
                         ┌─────────────────────┐
                         │  PUBLIC LANDING     │
                         │  React Website      │
                         │  Client-built       │
                         └──────────┬──────────┘
                                    │
                         CMS / Booking APIs
                                    │
                                    ▼
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ Reservation App      │──▶│                      │◀──│ Management App       │
│ React + TypeScript   │   │   Express Backend    │   │ React + TypeScript   │
└──────────────────────┘   │                      │   └──────────────────────┘
                           │  Domain / Services   │
                           └──────────┬───────────┘
                                      │
                  ┌───────────────────┼────────────────────┐
                  │                   │                    │
                  ▼                   ▼                    ▼
             MongoDB              Redis/Queue           Stripe
                  │                   │                    │
                  │                   ▼                    ▼
                  │              Background Jobs       Webhooks
                  │                   │
                  └──────────┬────────┘
                             │
                             ▼
                       Email Provider
```

---

# 5. Application Boundaries

The system has three frontend consumers.

## 5.1 Public Website

Owned/developed separately by the client/company.

Responsibilities:

- brand presentation;
- property information;
- room/accommodation presentation;
- blog/content;
- SEO pages;
- booking CTA.

It consumes:

- CMS/public content APIs;
- room/public accommodation APIs;
- availability/booking entry points as agreed.

It does not own:

- booking business logic;
- pricing authority;
- payment state;
- inventory state.

---

## 5.2 Reservation Application

Responsibilities:

- customer search;
- availability;
- accommodation details;
- rate selection;
- authentication;
- booking;
- payment;
- account;
- My Bookings;
- cancellation.

It should remain focused on customer-facing reservation workflows.

It must not directly access MongoDB.

---

## 5.3 Management Application

Responsibilities:

- dashboard;
- room management;
- availability;
- reservations;
- customers;
- payments;
- check-in/check-out;
- coupons;
- CMS;
- operational settings.

It communicates exclusively through authenticated backend APIs.

It must not bypass the API to manipulate production data.

---

# 6. Backend Architecture

Recommended backend structure:

```text
server/
├── src/
│   ├── config/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── domain/
│   ├── models/
│   ├── repositories/
│   ├── middleware/
│   ├── validators/
│   ├── integrations/
│   │   ├── stripe/
│   │   ├── email/
│   │   └── media/
│   ├── jobs/
│   ├── queues/
│   ├── events/
│   ├── utils/
│   └── app.ts
└── server.ts
```

The exact folder structure can change, but responsibilities should remain separated.

---

# 7. Backend Layer Responsibilities

## Routes

Define HTTP endpoints and route-level middleware.

Routes should not contain large business workflows.

## Controllers

Responsibilities:

- parse request;
- invoke service;
- return response.

Controllers should remain thin.

## Services

Contain application/business workflows.

Examples:

- BookingService
- AvailabilityService
- PaymentService
- RoomService
- CMSService
- NotificationService

## Domain Logic

Contains critical business rules.

Examples:

- overlap calculation;
- booking transitions;
- cancellation eligibility;
- pricing validation;
- hold expiration;
- room assignment rules.

Critical business logic should not be duplicated across controllers.

## Repositories

Abstract database access where useful.

Responsibilities:

- query MongoDB;
- update documents;
- transactional/atomic operations;
- indexes/query-specific access.

## Integrations

External provider adapters:

- Stripe
- Email
- Media storage

This keeps third-party-specific code away from core booking logic.

---

# 8. Domain Modules

The backend should be organized around these modules:

```text
Authentication
Users
Properties
Room Types
Rooms
Rate Plans
Availability
Reservations
Payments
Refunds
Coupons
CMS
Media
Notifications
Reviews (if included)
Admin
Audit Logs
Settings
```

---

# 9. Request Lifecycle

A typical API request:

```text
Browser
  ↓
HTTPS
  ↓
Express Router
  ↓
Security Middleware
  ↓
Authentication
  ↓
Authorization
  ↓
Validation
  ↓
Controller
  ↓
Application Service
  ↓
Domain Rules
  ↓
Repository / Integration
  ↓
Response
```

For example:

```text
POST /bookings
      ↓
Auth
      ↓
Validate
      ↓
BookingService
      ↓
AvailabilityService
      ↓
PricingService
      ↓
Inventory/Booking persistence
      ↓
Payment integration
      ↓
Response
```

---

# 10. Authentication Architecture

Recommended approach:

- secure HttpOnly cookie/session or equivalent secure token strategy;
- short-lived authentication credentials where applicable;
- refresh/session mechanism if required;
- password hashing using a modern password hashing algorithm;
- secure password reset tokens.

The final authentication implementation must be consistent across:

- Reservation App
- Admin App

Customer and admin authorization must be separated.

---

# 11. Authorization Architecture

Role examples:

```text
CUSTOMER
ADMIN
EDITOR
MANAGER
SUPER_ADMIN
```

The final role set can be reduced if the client does not need multiple staff levels.

Authorization flow:

```text
Request
 ↓
Authenticate
 ↓
Identify User
 ↓
Load Role/Permissions
 ↓
Permission Check
 ↓
Allow / Reject
```

Never rely only on frontend route guards.

---

# 12. Database Architecture

MongoDB is the primary transactional datastore.

Conceptual collections:

```text
users
admins / users
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
cmsSections
blogs
faqs
offers
media
emailTemplates
notificationJobs / notifications
siteSettings
auditLogs
```

The exact schema is defined in:

`05_DATABASE_AND_API_SPEC.md`

---

# 13. Single-Property Model

The application currently operates on one property.

Conceptually:

```text
Property
  │
  ├── Room Types
  │      ├── Deluxe
  │      ├── Premium
  │      └── Suite
  │
  └── Physical Rooms
         ├── 101
         ├── 102
         ├── 201
         └── 301
```

A property entity may still be retained internally if useful for clean data modeling and future extensibility, but the first release must not introduce unnecessary multi-property workflows.

---

# 14. Room Inventory Model

A room type describes the sellable accommodation category.

A physical room represents actual inventory.

Example:

```text
Deluxe Room
   ├── Room 101
   ├── Room 102
   └── Room 103
```

This distinction is important because bookings ultimately consume physical inventory.

If the business later chooses pooled inventory instead of individually assigned physical rooms, that should be an explicit architecture change.

---

# 15. Availability Architecture

Availability is derived from:

- active room state;
- room type;
- manual blocks;
- existing bookings;
- active temporary holds;
- date restrictions;
- occupancy constraints.

Basic overlap rule:

```text
existingCheckIn < requestedCheckOut
AND
existingCheckOut > requestedCheckIn
```

Check-out is treated as exclusive for standard overnight stays.

---

# 16. Availability Search Flow

```text
Search Request
     ↓
Validate dates/guests
     ↓
Load active rooms
     ↓
Remove blocked rooms
     ↓
Remove overlapping booked/held rooms
     ↓
Validate capacity
     ↓
Load applicable rate plans
     ↓
Calculate prices
     ↓
Return availability
```

Search should be optimized with appropriate indexes.

---

# 17. Final Booking Validation

Search results are not authoritative.

At booking time:

```text
Client Selection
      ↓
Backend Revalidation
      ↓
Price Recalculation
      ↓
Availability Check
      ↓
Atomic Hold/Reservation
      ↓
Payment
```

This prevents stale browser data from creating invalid bookings.

---

# 18. Temporary Hold Architecture

Redis is recommended for short-lived holds and related distributed coordination.

Conceptually:

```text
hold:{roomId}:{dateRange}:{bookingIntent}
```

The exact key design is implementation-specific.

Hold requirements:

- unique identifier;
- creation time;
- expiration time;
- booking/user reference;
- room/inventory reference;
- payment context.

Expired holds must be automatically released.

MongoDB should remain the durable source of truth for the final booking.

---

# 19. Double-Booking Protection

The architecture must protect against:

- two users selecting the same room;
- concurrent checkout;
- duplicate requests;
- retry requests;
- delayed payment callbacks;
- duplicate webhooks.

Protection may combine:

- Redis locks/holds;
- atomic MongoDB operations;
- transactions where supported/appropriate;
- unique constraints/indexes;
- idempotency keys.

Redis alone must not be treated as the permanent booking database.

---

# 20. Booking State Machine

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

Alternative states:

```text
PAYMENT_PENDING → EXPIRED
PAYMENT_PENDING → CANCELLED
CONFIRMED → CANCELLED
CANCELLED → REFUNDED
HELD → EXPIRED
```

Invalid transitions must be rejected.

---

# 21. Payment Architecture

Recommended flow:

```text
Reservation App
      ↓
Backend
      ↓
Create Stripe Payment Context
      ↓
Stripe
      ↓
Customer Payment
      ↓
Stripe Webhook
      ↓
Backend Verification
      ↓
PaymentService
      ↓
BookingService
      ↓
CONFIRMED
```

The browser must never contain the Stripe secret key.

---

# 22. Stripe Webhook Architecture

Webhook endpoint:

```text
POST /api/webhooks/stripe
```

Processing:

```text
Receive Request
      ↓
Verify Signature
      ↓
Extract Event ID
      ↓
Check Idempotency
      ↓
Process Supported Event
      ↓
Update Payment
      ↓
Update Booking
      ↓
Create Notification Job
      ↓
Mark Event Processed
```

Unsupported/unrecognized events should be safely acknowledged or logged according to implementation policy.

---

# 23. Payment Idempotency

Every payment operation that can be retried must be designed for idempotency.

Examples:

- payment creation;
- webhook processing;
- refund processing;
- booking confirmation.

If the same event/request is received twice:

```text
First → Process
Second → Detect Already Processed
       → Do Not Duplicate
```

---

# 24. Email Architecture

Email should be asynchronous.

```text
Business Service
      ↓
Domain Event
      ↓
Notification Job
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
confirmation.email job
      ↓
Email Worker
      ↓
Provider
```

Booking confirmation must not depend on successful email delivery.

---

# 25. Background Job Architecture

Recommended jobs:

```text
ExpireBookingHolds
SendCheckInReminders
SendNotificationEmails
RetryFailedEmails
ProcessScheduledContent
PaymentReconciliation (if required)
CleanupExpiredTemporaryData
```

Jobs must be idempotent where retries are possible.

---

# 26. Redis Responsibilities

Redis can be used for:

- temporary booking holds;
- distributed locks;
- rate limiting;
- caching;
- queue backend;
- short-lived session/state where appropriate.

Redis should not replace MongoDB as the durable source of truth.

---

# 27. CMS Architecture

CMS is a separate content domain inside the same backend.

Conceptually:

```text
Admin CMS
    ↓
CMS Service
    ↓
MongoDB
    ↓
Public CMS API
    ↓
Landing Website
```

CMS must support publication state:

```text
DRAFT
PUBLISHED
ARCHIVED
```

Public endpoints should return only content that is intended to be public.

---

# 28. CMS Content Separation

Transactional data:

```text
Bookings
Payments
Rooms
Availability
Users
```

Content data:

```text
Pages
Blogs
FAQs
Offers
Gallery
Site Settings
SEO
```

These domains should not be tightly coupled.

For example, deleting a CMS room description must never delete a historical booking.

---

# 29. Media Architecture

Recommended:

```text
Admin
 ↓
Upload
 ↓
Cloudinary / S3
 ↓
Media URL / Key
 ↓
MongoDB Metadata
 ↓
CMS Content
```

Large binary media should not be stored directly inside MongoDB documents.

Media metadata may include:

- URL/key;
- provider;
- width;
- height;
- MIME type;
- alt text;
- title;
- association;
- createdAt.

---

# 30. Public API Boundary

Public APIs should expose only intended public data.

Examples:

```text
GET /api/public/property
GET /api/public/rooms
GET /api/public/rooms/:slug
GET /api/public/pages/:slug
GET /api/public/blogs
GET /api/public/blogs/:slug
GET /api/public/faqs
GET /api/public/offers
GET /api/public/gallery
```

Private/admin data must never be exposed through public endpoints.

---

# 31. Reservation API Boundary

Conceptual endpoints:

```text
POST /api/availability/search

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password

GET  /api/me
GET  /api/me/bookings
GET  /api/me/bookings/:id

POST /api/bookings
POST /api/bookings/:id/cancel

POST /api/payments/create
GET  /api/payments/:id
```

Exact API contracts are defined in the API specification document.

---

# 32. Admin API Boundary

Conceptual:

```text
GET    /api/admin/dashboard

GET    /api/admin/rooms
POST   /api/admin/rooms
PATCH  /api/admin/rooms/:id

GET    /api/admin/room-types
POST   /api/admin/room-types
PATCH  /api/admin/room-types/:id

GET    /api/admin/availability
POST   /api/admin/availability/block
DELETE /api/admin/availability/block/:id

GET    /api/admin/bookings
GET    /api/admin/bookings/:id
PATCH  /api/admin/bookings/:id/status

GET    /api/admin/customers
GET    /api/admin/payments

GET    /api/admin/coupons
POST   /api/admin/coupons
PATCH  /api/admin/coupons/:id
```

---

# 33. CMS API Boundary

Conceptual:

```text
GET    /api/admin/cms/pages
POST   /api/admin/cms/pages
PATCH  /api/admin/cms/pages/:id
POST   /api/admin/cms/pages/:id/publish

GET    /api/admin/cms/blogs
POST   /api/admin/cms/blogs
PATCH  /api/admin/cms/blogs/:id

GET    /api/admin/cms/faqs
GET    /api/admin/cms/offers
GET    /api/admin/cms/media
```

Public content:

```text
GET /api/public/cms/pages/:slug
GET /api/public/cms/blogs/:slug
```

---

# 34. Error Architecture

API errors should follow a consistent format.

Conceptually:

```json
{
  "success": false,
  "error": {
    "code": "ROOM_UNAVAILABLE",
    "message": "The selected room is no longer available.",
    "details": {}
  }
}
```

Do not expose:

- stack traces;
- database internals;
- secrets;
- provider credentials;
- unnecessary sensitive data.

Error codes should be stable enough for frontend behavior.

---

# 35. Validation Architecture

Validation should happen at multiple levels:

```text
Frontend
   ↓
Basic UX validation
   ↓
Backend Request Validation
   ↓
Domain Validation
   ↓
Database Constraints
```

Frontend validation improves UX.

Backend/domain validation provides actual security and correctness.

---

# 36. Security Architecture

Security layers:

```text
HTTPS
 ↓
CORS
 ↓
Rate Limiting
 ↓
Authentication
 ↓
Authorization
 ↓
Input Validation
 ↓
Business Rules
 ↓
Database
```

Additional controls:

- secure password hashing;
- secure cookies/tokens;
- CSRF strategy where applicable;
- Stripe webhook verification;
- secret management;
- audit logs;
- dependency/security updates;
- production logging without sensitive values.

---

# 37. Data Ownership

### MongoDB owns

- users;
- rooms;
- room types;
- rates;
- bookings;
- payments metadata;
- CMS;
- notification state;
- audit records.

### Stripe owns

- card/payment instrument processing;
- payment-provider transaction state;
- Stripe customer/payment objects where used.

The application stores only the provider references and required business metadata.

### Email provider owns

- email delivery infrastructure;
- delivery events where supported.

The application stores notification status as required.

### Media provider owns

- binary media objects.

MongoDB stores references/metadata.

---

# 38. Observability

Production should provide enough visibility to diagnose:

- API errors;
- failed bookings;
- payment failures;
- webhook failures;
- queue failures;
- email failures;
- authentication failures;
- slow operations.

Logs should include correlation/request identifiers where practical.

Never log:

- passwords;
- Stripe secret keys;
- card numbers;
- authentication tokens;
- unnecessary personal data.

---

# 39. Audit Architecture

Important admin actions should create audit records.

Examples:

```text
ROOM_CREATED
ROOM_UPDATED
ROOM_DISABLED
AVAILABILITY_BLOCKED
BOOKING_STATUS_CHANGED
BOOKING_CANCELLED
REFUND_REQUESTED
CHECKED_IN
CHECKED_OUT
CMS_PUBLISHED
CMS_ARCHIVED
ADMIN_ROLE_CHANGED
```

Audit record should contain, where appropriate:

- actor;
- action;
- entity;
- entity ID;
- timestamp;
- relevant safe metadata.

---

# 40. Caching Strategy

Caching may be applied to low-risk read-heavy data:

Good candidates:

- published CMS content;
- FAQs;
- public room metadata;
- site settings;
- public offers.

Avoid unsafe caching of highly dynamic:

- final room availability;
- payment state;
- booking state.

Availability must be freshly validated before booking.

---

# 41. Rate Limiting

Apply stronger limits to sensitive endpoints:

- login;
- password reset;
- registration;
- availability search;
- coupon validation;
- payment creation;
- public contact endpoints if any.

Admin endpoints should have appropriate limits as well.

---

# 42. Transaction Boundaries

Database transactions should be used where multiple related writes must succeed together and MongoDB deployment supports the required transaction behavior.

Examples:

```text
Confirm Booking
  ├── update booking
  ├── update payment
  └── record inventory state
```

External provider calls must not be assumed to be part of a MongoDB transaction.

Use idempotency/reconciliation for external operations.

---

# 43. External Integration Boundary

External integrations must be isolated:

```text
Core Domain
    │
    ├── Stripe Adapter
    ├── Email Adapter
    └── Media Adapter
```

The domain should not be filled with provider-specific implementation details.

For example:

```text
PaymentService
     ↓
PaymentProvider Interface
     ↓
StripeAdapter
```

This makes future provider changes safer.

---

# 44. Environment Architecture

Separate environments:

```text
Development
    ↓
Staging / Test
    ↓
Production
```

Each environment should have separate:

- database;
- Stripe credentials;
- webhook endpoint;
- email configuration;
- storage where appropriate;
- secrets.

Production credentials must never be used casually in local development.

---

# 45. Environment Variables

Conceptual variables:

```text
NODE_ENV
PORT
MONGODB_URI
REDIS_URL

AUTH_SECRET / SESSION_SECRET

STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET

EMAIL_PROVIDER_KEY
EMAIL_FROM

MEDIA_PROVIDER_KEY
MEDIA_PROVIDER_SECRET

CLIENT_URL
ADMIN_URL
PUBLIC_SITE_URL
```

Actual naming is defined during implementation.

Secrets must remain server-side.

---

# 46. Deployment Architecture

A generic production deployment:

```text
                    Internet
                       │
                HTTPS / Domain
                       │
          ┌────────────┴────────────┐
          ▼                         ▼
 Reservation Frontend         Admin Frontend
          │                         │
          └────────────┬────────────┘
                       ▼
                 Express API
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
       MongoDB       Redis         Stripe
          │            │             │
          │            ▼             │
          │       Background        │
          │          Worker          │
          │            │             │
          └────────────┼─────────────┘
                       ▼
                 Email Provider
```

The actual cloud provider is a deployment decision, not an architectural dependency.

---

# 47. Frontend Architecture

Recommended reservation/admin structure:

```text
src/
├── app/
├── routes/
├── pages/
├── components/
├── features/
│   ├── auth/
│   ├── rooms/
│   ├── availability/
│   ├── bookings/
│   ├── payments/
│   ├── cms/
│   └── users/
├── services/
├── hooks/
├── lib/
├── schemas/
├── types/
└── utils/
```

Feature-oriented organization is preferred over one giant components directory.

---

# 48. Frontend State Strategy

Separate:

### Server State

Use a server-state/query library for:

- rooms;
- availability;
- bookings;
- CMS data;
- customers;
- payments.

### Local UI State

Use local state for:

- modals;
- dropdowns;
- tabs;
- temporary form state;
- visual interactions.

### Auth State

Use the agreed secure authentication mechanism.

Do not store highly sensitive credentials in localStorage unnecessarily.

---

# 49. Frontend API Rule

The frontend must not duplicate business logic that can become inconsistent with the backend.

Allowed:

- form validation;
- display calculations for UX;
- optimistic UI where safe.

Authoritative:

- availability;
- price;
- taxes/fees;
- coupon validity;
- booking status;
- payment status;
- permissions.

---

# 50. Admin Architecture

Admin is a separate frontend application.

Recommended areas:

```text
Dashboard
Reservations
Rooms
Room Types
Rates
Availability
Customers
Payments
Coupons
CMS
Media
Notifications
Settings
Audit Logs
```

Every area uses backend authorization.

---

# 51. CMS/Public Architecture

```text
Admin CMS
    ↓
MongoDB
    ↓
Public CMS API
    ↓
Client Landing Website
```

The public website should never require admin credentials.

Published content should be safe for public consumption.

---

# 52. Booking Domain Dependency Graph

```text
Property
   │
   ├── Room Type
   │      │
   │      └── Physical Room
   │
   └── Rate Plan
          │
          ▼
      Availability
          │
          ▼
       Booking
          │
          ├── User
          ├── Payment
          ├── Refund
          └── Notifications
```

This is the core business relationship.

---

# 53. Critical Architecture Invariants

The following must always remain true:

1. One physical room cannot have overlapping active confirmed reservations.
2. A search result does not guarantee availability.
3. Booking confirmation requires valid backend conditions.
4. Payment confirmation requires trusted Stripe verification.
5. Duplicate webhook events must be harmless.
6. Expired holds cannot remain active indefinitely.
7. Cancelled bookings must not consume active availability.
8. Historical booking records must remain auditable.
9. Public APIs cannot expose private admin/customer data.
10. Frontend cannot directly access production database.
11. Email failure cannot roll back a valid booking.
12. CMS drafts cannot become publicly published accidentally.
13. Admin permissions must be enforced server-side.
14. Provider secrets must never reach the browser.
15. Final prices must be determined/validated by the backend.

---

# 54. Scalability Strategy

The first release should be a modular monolith rather than premature microservices.

Recommended:

```text
One Express Application
        +
Modular Domain Services
        +
Background Worker
        +
MongoDB
        +
Redis
```

This provides clean separation without operational complexity.

The architecture can later extract high-load modules if required.

---

# 55. Why Not Microservices Initially?

The product is a single-property system with a focused domain.

Starting with many independently deployed services would add:

- deployment complexity;
- distributed debugging;
- networking complexity;
- duplicated auth/configuration;
- more infrastructure;
- higher maintenance cost.

A modular monolith is sufficient for the expected first release.

---

# 56. Failure Isolation

A failure in one subsystem should not unnecessarily destroy another.

Examples:

### Email down

Booking can still be confirmed.

### CMS unavailable

Existing booking operations should continue.

### Redis temporarily unavailable

The application should fail safely rather than create unsafe inventory state. The exact fallback depends on the hold/lock implementation.

### Stripe unavailable

Payment cannot be completed, but existing confirmed bookings should remain accessible.

---

# 57. Backup & Recovery

Production should have:

- database backups;
- backup retention policy;
- restore procedure;
- media redundancy where appropriate;
- environment/secrets recovery documentation.

A backup is not considered useful until restoration is understood/tested.

---

# 58. Architecture Acceptance Checklist

## Application Boundaries

- [ ] Reservation frontend is separate from admin frontend.
- [ ] Public website can consume CMS APIs.
- [ ] Shared backend serves all required clients.
- [ ] Frontends do not directly access MongoDB.

## Booking

- [ ] Availability is backend-controlled.
- [ ] Final availability is revalidated.
- [ ] Double booking is prevented.
- [ ] Holds expire.
- [ ] Booking state transitions are controlled.

## Payment

- [ ] Stripe secret remains server-side.
- [ ] Webhook signature is verified.
- [ ] Webhooks are idempotent.
- [ ] Payment and booking states are separate.

## CMS

- [ ] Admin CMS is protected.
- [ ] Public APIs expose published content only.
- [ ] CMS data is separated from transactional records.

## Security

- [ ] Admin authorization is server-side.
- [ ] Secrets are protected.
- [ ] Sensitive data is not logged.
- [ ] Input validation exists.

## Reliability

- [ ] Email is asynchronous.
- [ ] Background jobs are retryable/idempotent where needed.
- [ ] Critical errors are observable.
- [ ] Production backup/recovery exists.

---

# 59. Architecture Decisions To Confirm

Before final implementation, confirm:

1. Exact authentication strategy: secure cookie/session vs token architecture.
2. Redis provider.
3. Queue technology.
4. Email provider.
5. Media provider.
6. Hosting provider.
7. MongoDB hosting.
8. Stripe Checkout vs Payment Element.
9. Property timezone.
10. Currency.
11. Whether physical rooms are individually bookable/assigned.
12. Whether multiple rooms can be booked in one transaction.
13. Final admin roles.
14. Whether CMS editor/publisher approval is required.
15. Whether reviews are included in release one.

These choices can be finalized in the implementation/deployment documents without changing the core domain architecture.

---

# 60. Relationship With Next Documents

### `05_DATABASE_AND_API_SPEC.md`

Will define:
- exact collections;
- fields;
- indexes;
- relationships;
- API contracts;
- request/response schemas;
- error codes.

### `06_RESERVATION_PAYMENT_EMAIL.md`

Will define:
- exact availability algorithm;
- hold implementation;
- booking state machine;
- pricing;
- Stripe event handling;
- refund logic;
- email event matrix;
- queue/retry behavior.

### `07_ADMIN_AND_CMS_SPEC.md`

Will define:
- exact admin screens;
- tables;
- forms;
- filters;
- actions;
- permissions;
- CMS entities;
- publishing workflow.

### `08_UI_UX_SEO_SECURITY.md`

Will define:
- design system;
- responsive rules;
- accessibility;
- SEO;
- security implementation requirements.

---

# 61. Final Architecture Statement

> The platform will be implemented as a modular single-property reservation and management system using separate React-based customer reservation and management applications backed by a shared Express API and MongoDB data layer. Redis and background jobs will support temporary booking holds, concurrency controls and asynchronous notifications. Stripe will handle payment processing, with verified webhooks determining trusted payment state. CMS content will be managed through the admin application and exposed through public APIs to the separately developed landing website. Business-critical rules will remain server-side, while external providers will be isolated behind integration boundaries.

**End of System Architecture Specification**
