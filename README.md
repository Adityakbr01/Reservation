# Single-Property Hotel Reservation Platform

A production-oriented reservation, payment, management, and CMS platform for a **single hotel/property with multiple physical rooms**.

> This repository is designed as a modular hospitality platform, not a multi-hotel marketplace.

---

## 1. Project Overview

The platform provides:

- Customer reservation / booking engine
- Real-time room availability
- Physical room inventory management
- Room types and rate plans
- Temporary room holds
- Stripe payment integration
- Booking confirmation and payment webhooks
- Customer accounts and My Bookings
- Admin / Management panel
- Customer, reservation, room, payment, and refund management
- CMS for property content
- Media management
- SEO metadata management
- Email notifications and scheduled reminders
- Audit logging
- Role-based access control
- Production-ready API architecture

The public marketing/landing website is built separately by the client/company and consumes the APIs provided by this platform where required.

---

## 2. Business Model

### Property Model

There is **one physical hotel/property**.

That property contains:

- Multiple room types
- Multiple individual physical rooms
- Multiple rate plans
- Reservations against physical room inventory

Example:

```text
Property
│
├── Room Type: Deluxe Room
│   ├── Room 101
│   ├── Room 102
│   └── Room 103
│
├── Room Type: Suite
│   ├── Room 201
│   └── Room 202
│
└── Room Type: Family Room
    ├── Room 301
    └── Room 302
```

This is **not**:

```text
Hotel A
Hotel B
Hotel C
```

There is no hotel marketplace, property-owner marketplace, or vendor system in the current scope.

---

## 3. Responsibility Split

### Client / Company

The client/company is responsible for:

- Public landing/marketing website frontend
- Branding assets
- Final hotel content
- Hotel/property information
- Room content and images
- Pricing/rate information
- Policies
- Stripe account
- Stripe KYC/business verification
- Stripe bank settlement
- Domain/DNS
- Production hosting accounts where applicable
- Email provider account
- Third-party service subscriptions

### This Platform

This project is responsible for:

- Reservation engine
- Booking flow
- Availability
- Room inventory
- Rate plans
- Temporary holds
- Payments
- Stripe integration
- Authentication
- Customer accounts
- Admin/management panel
- CMS backend
- Media management
- Email notification system
- APIs
- Security
- Audit logs
- Booking/payment lifecycle management

---

## 4. Reference Websites

The following websites were used as conceptual product references:

- https://thefoxatoddington.com/
- https://bookings.thefoxatoddington.com/search-rates
- https://www.avington.com/
- SynXis-style hotel booking flows

These references are used only to understand hospitality UX, booking-engine patterns, information architecture, and operational workflows.

Do not copy proprietary code, content, branding, or design assets.

---

## 5. Core Technology Stack

### Frontend

- React
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Router
- TanStack Query / appropriate server-state solution
- Form validation library
- Shared TypeScript types

### Backend

- Node.js
- Express.js
- TypeScript
- MongoDB
- Mongoose

### Infrastructure / Supporting Services

- Redis
- Stripe
- Cloudinary or S3-compatible object storage
- Email provider
- Background job/worker system
- Docker where applicable

### Development

- ESLint
- Prettier
- Git
- GitHub
- Environment-based configuration
- Automated testing
- CI/CD

---

## 6. Recommended Repository Structure

```text
project-root/
│
├── apps/
│   │
│   ├── reservation/
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   └── ...
│   │
│   └── management/
│       ├── src/
│       ├── public/
│       ├── package.json
│       └── ...
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── properties/
│   │   │   ├── roomTypes/
│   │   │   ├── rooms/
│   │   │   ├── ratePlans/
│   │   │   ├── availability/
│   │   │   ├── bookings/
│   │   │   ├── payments/
│   │   │   ├── refunds/
│   │   │   ├── coupons/
│   │   │   ├── cms/
│   │   │   ├── media/
│   │   │   ├── notifications/
│   │   │   ├── emails/
│   │   │   ├── auditLogs/
│   │   │   └── webhooks/
│   │   │
│   │   ├── middleware/
│   │   ├── jobs/
│   │   ├── workers/
│   │   ├── utils/
│   │   ├── types/
│   │   ├── app.ts
│   │   └── server.ts
│   │
│   └── package.json
│
├── shared/
│   ├── types/
│   ├── constants/
│   ├── schemas/
│   └── utils/
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
├── .env.example
├── .gitignore
├── docker-compose.yml
├── package.json
└── README.md
```

The exact folder structure can be adjusted during implementation, but domain boundaries must remain clear.

---

## 7. Main Applications

### Reservation App

Customer-facing booking engine.

Responsibilities:

- Search availability
- Select room
- Select rate plan
- Enter guest information
- Apply coupon
- Review booking
- Authenticate/register/login
- Create temporary room hold
- Start Stripe payment
- Display payment state
- Show booking confirmation
- My Bookings
- Cancellation/refund information

The reservation app must never be treated as the source of truth for room availability.

---

### Management App

Staff/admin-facing application.

Responsibilities:

- Dashboard
- Reservations
- Customers
- Rooms
- Room types
- Rate plans
- Availability
- Payments
- Refunds
- Coupons
- Check-in/out
- CMS
- Media
- Email monitoring
- Audit logs
- Settings
- Admin users and permissions

---

### Backend API

The Express backend is the authoritative business layer.

It controls:

- Authentication
- Authorization
- Availability
- Pricing
- Booking creation
- Inventory allocation
- Holds
- Payment creation
- Stripe webhook processing
- Refunds
- CMS data
- Notifications
- Audit logging
- Security

Frontend applications must not implement authoritative business rules independently.

---

## 8. Core Booking Flow

```text
Customer
   │
   ▼
Search Dates
   │
   ▼
Availability Search
   │
   ▼
Select Room + Rate
   │
   ▼
Guest Details
   │
   ▼
Booking Review
   │
   ▼
Temporary Room Hold
   │
   ▼
Create Payment
   │
   ▼
Stripe Checkout / Payment
   │
   ├──────────────► Failed
   │                    │
   │                    ▼
   │              Release / Expire Hold
   │
   ▼
Stripe Webhook
   │
   ▼
Verify Payment
   │
   ▼
Confirm Booking
   │
   ▼
Send Confirmation Email
```

---

## 9. Availability Rule

A room is unavailable when an existing reservation overlaps the requested stay.

Use:

```text
existingCheckIn < requestedCheckOut
AND
existingCheckOut > requestedCheckIn
```

Therefore:

```text
Existing: 10 Jan → 15 Jan

Requested: 15 Jan → 18 Jan
Result: Available
```

Checkout is exclusive.

The frontend search result is informational only. Final availability must be checked again on the backend immediately before booking/holding inventory.

---

## 10. Temporary Room Holds

A room should be temporarily held before payment is completed.

Example:

```text
AVAILABLE
    │
    ▼
HELD
    │
    ├── Payment succeeds ──► CONFIRMED
    │
    └── Hold expires ─────► AVAILABLE
```

Recommended responsibilities:

- Redis for short-lived locks/holds
- Database as durable source of truth
- Hold expiration timestamp
- Background cleanup
- No permanent inventory blocking after expiration

---

## 11. Booking State Machine

Recommended lifecycle:

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
HELD ─────────────► EXPIRED
PAYMENT_PENDING ──► EXPIRED
CONFIRMED ────────► CANCELLED
CONFIRMED ────────► REFUND_PENDING
REFUND_PENDING ───► REFUNDED
```

Booking status and payment status are separate concepts.

---

## 12. Payment Lifecycle

Payment states:

```text
PENDING
PROCESSING
PAID
FAILED
REFUNDED
PARTIALLY_REFUNDED
```

Stripe is the payment provider.

### Important Rules

- Stripe secret keys stay on the backend.
- Never trust a frontend success redirect as proof of payment.
- Verify Stripe webhook signatures.
- Process webhooks idempotently.
- Store Stripe identifiers.
- Payment amount must be calculated/validated server-side.
- Booking confirmation happens after verified payment state.
- Refunds must be recorded.
- Payment failures must not create confirmed bookings.

---

## 13. Stripe Responsibility

The client/company should own the Stripe account.

The client is responsible for:

- Stripe account
- KYC/business verification
- Bank account
- Settlement
- Stripe fees
- Refund costs
- Disputes/chargebacks
- Tax/payment compliance

The development platform only integrates Stripe technically.

Third-party Stripe fees are not part of the development fee.

---

## 14. Authentication

Customer authentication includes:

- Register
- Login
- Logout
- Forgot password
- Reset password
- Session/token handling
- Protected My Bookings

Customer authorization:

```text
Customer A
   ↓
Can access
   ↓
Only Customer A's bookings/profile
```

Admin authorization must be enforced by backend RBAC.

Possible roles:

```text
customer
editor
manager
admin
super_admin
```

Exact roles and permissions can be configured.

Frontend route guards are not a security boundary.

---

## 15. Admin Modules

Management panel should include:

```text
Dashboard
Reservations
Customers
Room Types
Physical Rooms
Rate Plans
Availability
Payments
Refunds
Coupons
CMS
Media
Emails / Notifications
Audit Logs
Admin Users
Settings
```

Every sensitive action should be authorized server-side and important operational changes should be auditable.

---

## 16. CMS

CMS is designed for the client/company to manage hotel content without changing application code.

Content areas can include:

- General pages
- Property/About
- Room content
- Gallery
- Offers
- Blogs/articles
- FAQs
- Policies
- Contact/property information
- Site settings
- SEO metadata

Content lifecycle:

```text
DRAFT
  ↓
PUBLISHED
  ↓
ARCHIVED
```

Public APIs should expose published content only.

---

## 17. Media

Images should be stored in an external media/object-storage provider.

Database stores metadata such as:

```text
url
storageKey
filename
altText
mimeType
width
height
size
folder
createdBy
```

Do not store large binary images directly inside MongoDB documents.

---

## 18. SEO / CMS Requirements

CMS-managed pages should support:

- SEO title
- Meta description
- Slug
- Canonical URL
- Open Graph metadata
- Index/noindex control
- Image alt text
- Structured data where appropriate
- Sitemap integration
- Robots configuration where required

The public landing website owns final frontend SEO rendering.

---

## 19. Email Notifications

Important email events include:

- Booking received
- Payment confirmed
- Payment failed
- Booking cancelled
- Check-in reminder
- Check-in completed
- Check-out completed
- Refund update
- Relevant admin notifications

Recommended architecture:

```text
Business Event
     │
     ▼
Notification Job
     │
     ▼
Queue
     │
     ▼
Email Worker
     │
     ▼
Email Provider
```

Email failure should not corrupt booking/payment state.

Use retries and idempotency.

---

## 20. Database Overview

Main MongoDB collections/entities:

```text
users
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

Historical booking data must preserve snapshots of important values such as:

- Room name
- Rate plan
- Price
- Taxes
- Fees
- Coupon
- Guest information required for the reservation

Future CMS/pricing edits must not rewrite historical booking facts.

---

## 21. API Principles

API should be:

- REST-oriented
- Versioned where appropriate
- JSON-based
- Authenticated
- Role-aware
- Validated
- Rate-limited
- Idempotent for relevant operations
- Consistent in response/error structure

Suggested base:

```text
/api/v1
```

Example:

```text
GET    /api/v1/availability
POST   /api/v1/bookings
GET    /api/v1/bookings/:id
POST   /api/v1/bookings/:id/cancel

POST   /api/v1/payments/create
POST   /api/v1/webhooks/stripe

GET    /api/v1/me/bookings

GET    /api/v1/admin/reservations
PATCH  /api/v1/admin/reservations/:id
POST   /api/v1/admin/reservations/:id/check-in
POST   /api/v1/admin/reservations/:id/check-out

GET    /api/v1/cms/pages
POST   /api/v1/admin/cms/pages
PATCH  /api/v1/admin/cms/pages/:id
```

Exact endpoint contracts are defined in the project documentation.

---

## 22. Security Requirements

Minimum security requirements:

- HTTPS in production
- Secure authentication
- Password hashing
- Secure cookies/tokens according to chosen auth architecture
- Backend RBAC
- Request validation
- Input sanitization
- Rate limiting
- CORS configuration
- Security headers
- Stripe webhook signature verification
- Idempotency
- Audit logs
- Secret management
- No secrets in frontend code
- No Stripe secret key in browser
- Safe error responses
- File upload validation
- CMS rich-text sanitization
- Access control on customer data
- Protection against unauthorized admin actions

---

## 23. Error Handling

Use a consistent API error format.

Example:

```json
{
  "success": false,
  "error": {
    "code": "ROOM_NOT_AVAILABLE",
    "message": "The selected room is no longer available."
  }
}
```

Errors should be:

- Predictable
- Machine-readable
- User-safe
- Logged internally when appropriate

Never expose stack traces, secrets, or internal database details to users.

---

## 24. Idempotency

Idempotency is required for sensitive operations such as:

- Booking creation
- Payment creation
- Stripe webhooks
- Refund creation
- Notification delivery

The same event/request must not accidentally:

- Create two bookings
- Charge twice
- Refund twice
- Send duplicate critical notifications

---

## 25. Concurrency / Double Booking

The most important inventory rule:

> Two customers must never be able to successfully book the same physical room for overlapping dates.

Protection should include:

1. Backend availability recheck
2. Temporary hold
3. Atomic/transactional persistence
4. Redis lock where appropriate
5. Final availability validation before confirmation
6. Idempotent booking/payment handling

Availability search alone is never enough.

---

## 26. Background Jobs

Background processing can handle:

- Hold expiration
- Check-in reminders
- Email delivery
- Email retries
- Notification retries
- Webhook reconciliation where needed
- Cleanup tasks
- Scheduled operational jobs

Redis can support:

- Locks
- Temporary holds
- Queues
- Rate limiting
- Caching

---

## 27. Testing Strategy

The project should include:

### Unit Tests

- Availability calculation
- Pricing
- Coupon validation
- State transitions
- Permission checks
- Validation

### Integration Tests

- Booking creation
- Hold creation
- Payment creation
- Stripe webhook processing
- Cancellation
- Refund
- CMS publishing
- Authentication

### End-to-End Tests

At minimum:

```text
Search
→ Select Room
→ Guest Details
→ Hold
→ Stripe Payment
→ Webhook
→ Confirmation
```

Also test:

```text
Payment failure
Hold expiration
Concurrent booking
Cancellation
Refund
Customer My Bookings
Admin check-in
Admin check-out
CMS publish
Unauthorized access
```

---

## 28. Environment Variables

Never commit production secrets.

Use `.env.example` to document required variables.

Example categories:

```env
NODE_ENV=

PORT=

MONGODB_URI=

REDIS_URL=

JWT_SECRET=
SESSION_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

EMAIL_PROVIDER_API_KEY=
EMAIL_FROM=

MEDIA_STORAGE_KEY=
MEDIA_STORAGE_SECRET=
MEDIA_STORAGE_BUCKET=

CLIENT_APP_URL=
RESERVATION_APP_URL=
MANAGEMENT_APP_URL=
```

Actual variables may change depending on selected providers.

---

## 29. Local Development

Typical development sequence:

```bash
# Install dependencies
npm install

# Start infrastructure if using Docker
docker compose up -d

# Start backend
npm run dev

# Start reservation app
npm run dev:reservation

# Start management app
npm run dev:management
```

Exact scripts should be finalized in the root `package.json`.

---

## 30. Development Order

Recommended implementation order:

### Phase 1 — Foundation

- Repository setup
- TypeScript
- ESLint/Prettier
- Environment configuration
- Express server
- MongoDB
- Redis
- Shared types
- Error handling
- Logging

### Phase 2 — Authentication

- Customer auth
- Admin auth
- Password reset
- RBAC
- Protected routes

### Phase 3 — Inventory

- Property
- Room types
- Physical rooms
- Rate plans
- Availability blocks

### Phase 4 — Reservation Engine

- Availability search
- Pricing
- Room selection
- Holds
- Booking creation
- Booking lifecycle

### Phase 5 — Stripe

- Payment creation
- Stripe integration
- Webhooks
- Idempotency
- Refunds

### Phase 6 — Email

- Email templates
- Notification events
- Queue/worker
- Retries
- Scheduled reminders

### Phase 7 — Customer Account

- My Bookings
- Booking details
- Cancellation
- Payment/refund status

### Phase 8 — Management Panel

- Dashboard
- Reservations
- Rooms
- Availability
- Customers
- Payments
- Refunds
- Coupons
- Check-in/out
- Audit logs

### Phase 9 — CMS

- Pages
- Sections
- Rooms content
- Gallery
- Offers
- Blogs
- FAQs
- Policies
- SEO
- Media

### Phase 10 — Production Hardening

- Security review
- Performance
- Tests
- Logging
- Monitoring
- Backup/recovery
- Deployment
- CI/CD
- Final acceptance testing

---

## 31. Important Development Rules

### Rule 1 — Backend Is Authoritative

Never rely on frontend-only validation for:

- Availability
- Price
- Permissions
- Payment status
- Booking state
- Refunds

### Rule 2 — Do Not Mix CMS and Inventory

Room content is not the same as physical room inventory.

Example:

```text
Room Type Content
      ≠
Physical Room
```

### Rule 3 — Do Not Mix Booking and Payment State

A booking can be:

```text
CONFIRMED
```

while payment information is represented separately.

### Rule 4 — Never Trust Frontend Payment Success

Stripe webhook verification is authoritative.

### Rule 5 — Preserve Historical Booking Data

Do not rewrite historical booking prices or room snapshots when CMS/pricing changes.

### Rule 6 — Avoid Scope Creep

Features outside the documented scope require explicit approval and scope/quotation changes.

### Rule 7 — Do Not Build a Marketplace

Do not introduce:

- Multiple hotels
- Property owners
- Vendors
- Vendor dashboards
- Marketplace commissions

unless explicitly added to scope.

---

## 32. Out of Scope

Unless separately approved:

- Multi-property marketplace
- Property-owner/vendor accounts
- Booking.com/Airbnb/Expedia integrations
- OTA/channel manager
- Advanced revenue management
- Dynamic pricing engine
- POS/accounting/ERP
- Housekeeping management
- Maintenance management
- Native mobile apps
- Loyalty program
- Referral program
- Gift cards
- Advanced BI/analytics
- Full public marketing website frontend
- Multi-language expansion
- Multi-currency expansion
- Major redesigns
- Unspecified third-party integrations

---

## 33. Project Documentation

The detailed project documentation is located in:

```text
docs/
```

### Documentation Map

| Document | Purpose |
|---|---|
| `01_PROJECT_REQUIREMENTS_PRD.md` | Complete product requirements |
| `02_SCOPE_AND_ACCEPTANCE.md` | Scope, acceptance criteria, and boundaries |
| `03_USER_FLOWS.md` | Customer/admin/CMS workflows |
| `04_SYSTEM_ARCHITECTURE.md` | Technical architecture |
| `05_DATABASE_AND_API_SPEC.md` | Database and API contract |
| `06_RESERVATION_PAYMENT_EMAIL.md` | Booking, payment, refund, and email logic |
| `07_ADMIN_MANAGEMENT_SPEC.md` | Management/admin panel |
| `08_CMS_AND_CONTENT_SPEC.md` | CMS and content system |
| `09_MASTER_PROJECT_IMPLEMENTATION_GUIDE.md` | Master implementation reference |

---

## 34. Source of Truth

When implementing the project, use this priority:

```text
Master Implementation Guide
        ↓
Detailed Domain Documentation
        ↓
Approved Scope / Acceptance
        ↓
PRD
        ↓
Implementation Details
```

If two documents appear to conflict:

1. Do not silently choose one.
2. Identify the conflict.
3. Preserve the stricter business rule.
4. Resolve the decision before changing core architecture.
5. Update documentation after the decision.

---

## 35. AI Coding Agent Instructions

Any AI coding agent working on this repository must:

1. Read `README.md` first.
2. Read the relevant documentation before implementing a feature.
3. Inspect the existing codebase before creating new architecture.
4. Reuse existing modules when appropriate.
5. Avoid duplicate business logic.
6. Keep frontend and backend responsibilities separate.
7. Never move business-critical validation only to the frontend.
8. Follow the documented booking state machine.
9. Follow the documented payment state machine.
10. Treat Stripe webhooks as authoritative.
11. Preserve idempotency.
12. Protect physical room inventory from double booking.
13. Follow RBAC.
14. Validate all backend input.
15. Write tests for critical business logic.
16. Avoid unnecessary dependencies.
17. Do not introduce marketplace functionality.
18. Do not expand scope without explicit approval.
19. Keep API contracts documented.
20. Update documentation when architecture or behavior changes.

### Before Coding

The agent should first determine:

```text
What module am I changing?
What document defines this behavior?
What existing code already handles it?
What database entities are involved?
What API contract is required?
What permissions are required?
What failure states exist?
What tests are required?
```

---

## 36. Definition of Done

A feature is not considered complete simply because its UI works.

A feature is complete when:

- UI is implemented
- API is implemented
- Validation exists
- Authorization exists
- Database behavior is correct
- Error states are handled
- Loading states are handled
- Business rules are enforced server-side
- Critical race conditions are addressed
- Tests are added
- Audit requirements are satisfied
- Documentation is updated when necessary
- Production configuration is understood

---

## 37. Production Readiness Checklist

Before launch:

### Application

- [ ] Reservation flow tested
- [ ] Availability tested
- [ ] Double-booking protection tested
- [ ] Stripe payments tested
- [ ] Stripe webhooks verified
- [ ] Refund flow tested
- [ ] Cancellation flow tested
- [ ] Email delivery tested
- [ ] Admin permissions tested
- [ ] CMS publishing tested
- [ ] Customer account tested

### Security

- [ ] Production secrets configured
- [ ] HTTPS enabled
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Security headers enabled
- [ ] RBAC verified
- [ ] Webhook signatures verified
- [ ] File upload validation enabled

### Infrastructure

- [ ] MongoDB production configured
- [ ] Redis production configured
- [ ] Media storage configured
- [ ] Email provider configured
- [ ] Stripe production account configured
- [ ] Backups configured
- [ ] Monitoring configured
- [ ] Logs available
- [ ] Error alerts configured

### Business

- [ ] Property information entered
- [ ] Room types entered
- [ ] Physical rooms entered
- [ ] Rates configured
- [ ] Policies configured
- [ ] Cancellation rules confirmed
- [ ] Taxes/fees confirmed
- [ ] Email sender verified
- [ ] Stripe account verified
- [ ] Client acceptance completed

---

## 38. Final Architecture

The final platform can be summarized as:

```text
                  ┌────────────────────────────┐
                  │ Client Public Website      │
                  │ Marketing / Landing Site   │
                  └─────────────┬──────────────┘
                                │
                                ▼
                  ┌────────────────────────────┐
                  │ Reservation Web App        │
                  │ React + TypeScript         │
                  └─────────────┬──────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────┐
│                    Express Backend API                    │
│                                                          │
│ Auth │ Availability │ Booking │ Payment │ CMS │ Admin   │
└───────────────┬─────────────────────┬────────────────────┘
                │                     │
                ▼                     ▼
        ┌───────────────┐      ┌───────────────┐
        │ MongoDB       │      │ Redis         │
        │ Durable Data  │      │ Holds/Locks   │
        └───────────────┘      │ Queue/Cache   │
                               └───────┬───────┘
                                       │
                                       ▼
                                Background Worker
                                       │
                        ┌──────────────┴──────────────┐
                        ▼                             ▼
                   Email Provider                 Scheduled Jobs

                                │
                                ▼
                         Stripe Webhooks
                                │
                                ▼
                         Payment Confirmation
```

---

## 39. Final Project Statement

This project is a **single-property hotel reservation and management platform**.

Its primary responsibility is to provide a reliable connection between:

```text
Customer
   ↓
Availability
   ↓
Physical Room Inventory
   ↓
Reservation
   ↓
Stripe Payment
   ↓
Confirmation
   ↓
Hotel Operations
```

The management system and CMS provide the operational and content-control layer around the reservation engine.

The architecture must prioritize:

- Correct inventory
- Secure payments
- Reliable booking state
- Strong authorization
- Idempotency
- Auditability
- Maintainability
- Production reliability
- Clear scope boundaries

When in doubt, preserve the integrity of the booking/payment/inventory system over convenience in the UI.

---

## License

Private / Client Project.

Do not redistribute, resell, or reuse client-specific code, credentials, content, branding, or production data without authorization.
