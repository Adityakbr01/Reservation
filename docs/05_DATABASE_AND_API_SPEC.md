# 05 — DATABASE & API SPECIFICATION

**Project:** Single-Property Reservation & Management Platform  
**Document:** Database Model, Collections, Indexes & API Contracts  
**Status:** Development Baseline  
**Version:** 1.0  
**Companion Documents:**  
- `01_PROJECT_REQUIREMENTS_PRD.md`
- `02_SCOPE_AND_ACCEPTANCE.md`
- `03_USER_FLOWS.md`
- `04_SYSTEM_ARCHITECTURE.md`

---

# 1. Purpose

This document defines the backend data contract for the platform.

It specifies:

- MongoDB collections;
- document structures;
- field types;
- required/optional fields;
- enums;
- relationships;
- indexes;
- data ownership;
- API boundaries;
- request/response structures;
- validation rules;
- authorization requirements;
- error conventions;
- pagination/filtering conventions.

This document is intended to be directly usable by backend developers and AI coding agents.

---

# 2. Database Principles

1. MongoDB is the primary durable application database.
2. Backend services are the only components allowed to write production data.
3. Frontends never connect directly to MongoDB.
4. Booking/payment data must remain auditable.
5. Historical booking records must not depend on mutable CMS content.
6. Critical fields must be validated both at API and persistence levels.
7. Frequently queried fields must have appropriate indexes.
8. Status fields use controlled values.
9. External provider IDs must be stored where needed for reconciliation.
10. Secrets and raw card data must never be stored.
11. Soft disable/archive is preferred over destructive deletion for business entities with history.
12. Money must use a consistent integer minor-unit representation where practical.

---

# 3. Identifier Strategy

Every primary document should use a stable MongoDB `_id`.

External/business references should be separate where needed.

Examples:

```text
_id
bookingNumber
stripePaymentIntentId
stripeEventId
```

Do not expose MongoDB IDs as the only customer-facing booking reference.

---

# 4. Common Audit Fields

Applicable collections should use:

```text
createdAt: Date
updatedAt: Date
```

Administrative content may additionally use:

```text
createdBy: ObjectId
updatedBy: ObjectId
publishedAt: Date | null
publishedBy: ObjectId | null
```

Audit logs store actor and action separately.

---

# 5. Collection Overview

Core collections:

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
cmsSections
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

Some small entities may be embedded where appropriate.

---

# 6. USERS

Collection:

```text
users
```

Purpose:

Stores customer accounts.

Suggested schema:

```text
{
  _id: ObjectId,

  role: "CUSTOMER",

  firstName: String,
  lastName: String,

  email: String,
  normalizedEmail: String,

  phone: String | null,

  passwordHash: String | null,

  status: "ACTIVE" | "SUSPENDED" | "DELETED",

  emailVerifiedAt: Date | null,

  profile: {
    addressLine1: String | null,
    addressLine2: String | null,
    city: String | null,
    state: String | null,
    country: String | null,
    postalCode: String | null
  },

  lastLoginAt: Date | null,

  createdAt: Date,
  updatedAt: Date
}
```

## Rules

- `normalizedEmail` must be lowercase/normalized.
- Email should be unique for active accounts.
- Password hash must never be returned by APIs.
- Raw passwords are never stored.
- `role` for this collection is normally `CUSTOMER`.

## Indexes

```text
unique(normalizedEmail)
(status, createdAt)
```

---

# 7. ADMIN USERS / STAFF

If the system uses one unified users collection, admin fields can be stored there. If separation is preferred, use:

```text
adminUsers
```

Suggested:

```text
{
  _id: ObjectId,

  firstName: String,
  lastName: String,

  email: String,
  normalizedEmail: String,

  passwordHash: String,

  role: "ADMIN" | "MANAGER" | "EDITOR" | "SUPER_ADMIN",

  permissions: [String],

  status: "ACTIVE" | "SUSPENDED",

  lastLoginAt: Date | null,

  createdAt: Date,
  updatedAt: Date
}
```

The implementation must choose either a unified user model or separate staff collection before coding.

---

# 8. PROPERTIES

Although the current product is single-property, keeping a property document can provide clean ownership boundaries.

Collection:

```text
properties
```

Suggested:

```text
{
  _id: ObjectId,

  name: String,
  slug: String,

  description: String | null,

  contact: {
    email: String | null,
    phone: String | null,
    address: String | null,
    city: String | null,
    state: String | null,
    country: String | null,
    postalCode: String | null,
    latitude: Number | null,
    longitude: Number | null
  },

  checkInTime: String,
  checkOutTime: String,

  timezone: String,
  currency: String,

  status: "ACTIVE" | "INACTIVE",

  createdAt: Date,
  updatedAt: Date
}
```

There should normally be exactly one active property in the first release.

---

# 9. ROOM TYPES

Collection:

```text
roomTypes
```

Purpose:

Defines a sellable accommodation category.

Suggested:

```text
{
  _id: ObjectId,

  propertyId: ObjectId,

  name: String,
  slug: String,

  shortDescription: String | null,
  description: String | null,

  maxAdults: Number,
  maxChildren: Number,
  maxOccupancy: Number,

  beds: [
    {
      type: String,
      quantity: Number
    }
  ],

  amenities: [String],

  images: [
    {
      mediaId: ObjectId,
      altText: String | null,
      sortOrder: Number
    }
  ],

  status: "DRAFT" | "ACTIVE" | "INACTIVE",

  seo: {
    title: String | null,
    description: String | null,
    canonicalUrl: String | null,
    ogTitle: String | null,
    ogDescription: String | null,
    ogImage: String | null,
    noIndex: Boolean
  },

  createdAt: Date,
  updatedAt: Date
}
```

## Rules

- `slug` unique within property.
- Occupancy values must be positive.
- Disabled room types cannot be booked.

## Indexes

```text
(propertyId, slug) unique
(propertyId, status)
```

---

# 10. PHYSICAL ROOMS

Collection:

```text
rooms
```

Purpose:

Represents actual inventory.

Example:

```text
Deluxe Room
  ├── Room 101
  ├── Room 102
  └── Room 103
```

Suggested:

```text
{
  _id: ObjectId,

  propertyId: ObjectId,
  roomTypeId: ObjectId,

  name: String,
  roomNumber: String,

  floor: String | null,

  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE",

  notes: String | null,

  createdAt: Date,
  updatedAt: Date
}
```

## Rules

- Room number/name should be unique within property.
- Historical bookings must not be destroyed if a room is deactivated.
- Inactive/maintenance rooms cannot be assigned to new bookings.

## Indexes

```text
(propertyId, roomNumber) unique
(propertyId, roomTypeId, status)
```

---

# 11. RATE PLANS

Collection:

```text
ratePlans
```

Purpose:

Defines bookable pricing rules for a room type.

Suggested:

```text
{
  _id: ObjectId,

  propertyId: ObjectId,
  roomTypeId: ObjectId,

  name: String,
  slug: String,

  description: String | null,

  pricing: {
    type: "PER_NIGHT" | "PER_STAY",
    amount: Number,
    currency: String
  },

  restrictions: {
    minNights: Number | null,
    maxNights: Number | null,
    minAdvanceDays: Number | null,
    maxAdvanceDays: Number | null,

    validFrom: Date | null,
    validUntil: Date | null,

    daysOfWeek: [Number]
  },

  cancellationPolicyId: ObjectId | null,

  status: "DRAFT" | "ACTIVE" | "INACTIVE",

  createdAt: Date,
  updatedAt: Date
}
```

## Rules

- Amount is stored in the agreed minor currency unit.
- Currency is explicit.
- Rate plan must belong to the selected room type.
- Inactive/expired plans cannot be newly booked.

## Indexes

```text
(propertyId, roomTypeId, status)
(propertyId, slug) unique
```

---

# 12. AVAILABILITY BLOCKS

Collection:

```text
availabilityBlocks
```

Purpose:

Stores manual inventory blocks.

Suggested:

```text
{
  _id: ObjectId,

  propertyId: ObjectId,
  roomId: ObjectId,

  startDate: Date,
  endDate: Date,

  reason: String | null,

  createdBy: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

`endDate` is exclusive.

Example:

```text
start = 2026-10-10
end   = 2026-10-12

Blocks nights:
10th
11th
```

## Indexes

```text
(roomId, startDate, endDate)
(propertyId, startDate, endDate)
```

---

# 13. BOOKINGS

Collection:

```text
bookings
```

This is the primary reservation entity.

Suggested:

```text
{
  _id: ObjectId,

  bookingNumber: String,

  propertyId: ObjectId,

  userId: ObjectId | null,

  status:
    "DRAFT"
    | "HELD"
    | "PAYMENT_PENDING"
    | "CONFIRMED"
    | "CHECKED_IN"
    | "CHECKED_OUT"
    | "CANCELLED"
    | "EXPIRED",

  paymentStatus:
    "PENDING"
    | "PROCESSING"
    | "PAID"
    | "FAILED"
    | "REFUNDED"
    | "PARTIALLY_REFUNDED",

  checkIn: Date,
  checkOut: Date,

  guests: {
    adults: Number,
    children: Number
  },

  contact: {
    firstName: String,
    lastName: String,
    email: String,
    phone: String
  },

  pricing: {
    currency: String,

    subtotal: Number,
    discount: Number,
    taxes: Number,
    fees: Number,
    total: Number,

    couponCode: String | null
  },

  cancellation: {
    cancelledAt: Date | null,
    cancelledBy: ObjectId | null,
    reason: String | null
  },

  checkInRecord: {
    checkedInAt: Date | null,
    checkedInBy: ObjectId | null
  },

  checkOutRecord: {
    checkedOutAt: Date | null,
    checkedOutBy: ObjectId | null
  },

  hold: {
    holdId: String | null,
    expiresAt: Date | null
  },

  source: "DIRECT" | "ADMIN",

  notes: String | null,

  createdAt: Date,
  updatedAt: Date
}
```

## Rules

- `bookingNumber` unique.
- Check-out > check-in.
- Total is calculated server-side.
- Booking status and payment status remain separate.
- Historical pricing must remain stored in the booking.

## Indexes

```text
unique(bookingNumber)
(propertyId, status, checkIn)
(propertyId, checkOut)
(userId, createdAt)
(contact.email, createdAt)
(paymentStatus, createdAt)
```

---

# 14. BOOKING ITEMS

Collection:

```text
bookingItems
```

Used when a booking may contain multiple rooms/accommodations.

Suggested:

```text
{
  _id: ObjectId,

  bookingId: ObjectId,

  roomTypeId: ObjectId,
  roomId: ObjectId | null,

  ratePlanId: ObjectId,

  roomNameSnapshot: String,
  roomNumberSnapshot: String | null,
  ratePlanNameSnapshot: String,

  checkIn: Date,
  checkOut: Date,

  guests: {
    adults: Number,
    children: Number
  },

  pricing: {
    nightlyRates: [
      {
        date: Date,
        amount: Number
      }
    ],

    subtotal: Number,
    discount: Number,
    taxes: Number,
    fees: Number,
    total: Number,

    currency: String
  },

  createdAt: Date,
  updatedAt: Date
}
```

Snapshots are important so historical bookings do not change when room names/prices are edited later.

## Indexes

```text
(bookingId)
(roomId, checkIn, checkOut)
```

---

# 15. PAYMENTS

Collection:

```text
payments
```

Suggested:

```text
{
  _id: ObjectId,

  bookingId: ObjectId,
  userId: ObjectId | null,

  provider: "STRIPE",

  providerPaymentIntentId: String | null,
  providerCheckoutSessionId: String | null,

  amount: Number,
  currency: String,

  status:
    "PENDING"
    | "PROCESSING"
    | "PAID"
    | "FAILED"
    | "REFUNDED"
    | "PARTIALLY_REFUNDED",

  failureCode: String | null,
  failureMessage: String | null,

  paidAt: Date | null,

  metadata: Object,

  createdAt: Date,
  updatedAt: Date
}
```

## Rules

- Never store card number/CVC/raw payment credentials.
- Provider IDs should be unique where applicable.
- Payment records should remain immutable enough for auditability.

## Indexes

```text
(bookingId)
unique(providerPaymentIntentId) where present
(status, createdAt)
```

---

# 16. REFUNDS

Collection:

```text
refunds
```

Suggested:

```text
{
  _id: ObjectId,

  bookingId: ObjectId,
  paymentId: ObjectId,

  provider: "STRIPE",

  providerRefundId: String,

  amount: Number,
  currency: String,

  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELLED",

  reason: String | null,

  requestedBy: ObjectId | null,

  processedAt: Date | null,

  createdAt: Date,
  updatedAt: Date
}
```

## Indexes

```text
unique(providerRefundId)
(bookingId, createdAt)
(paymentId)
```

---

# 17. COUPONS

Collection:

```text
coupons
```

Suggested:

```text
{
  _id: ObjectId,

  propertyId: ObjectId,

  code: String,
  normalizedCode: String,

  discountType: "PERCENTAGE" | "FIXED",

  discountValue: Number,

  maxDiscount: Number | null,

  minimumBookingAmount: Number | null,

  validFrom: Date | null,
  validUntil: Date | null,

  usageLimit: Number | null,
  usageCount: Number,

  applicableRoomTypeIds: [ObjectId],

  status: "ACTIVE" | "INACTIVE" | "EXPIRED",

  createdBy: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

## Rules

- Codes are case-insensitive.
- Coupon validity is checked server-side.
- Usage cannot exceed configured limits.
- Discount cannot create invalid negative totals.

## Indexes

```text
(propertyId, normalizedCode) unique
(propertyId, status, validFrom, validUntil)
```

---

# 18. CMS PAGES

Collection:

```text
cmsPages
```

Suggested:

```text
{
  _id: ObjectId,

  propertyId: ObjectId | null,

  title: String,
  slug: String,

  pageType: "STANDARD" | "POLICY" | "LANDING",

  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",

  sections: [
    {
      sectionId: String,
      type: String,
      order: Number,
      data: Object
    }
  ],

  seo: {
    title: String | null,
    description: String | null,
    canonicalUrl: String | null,
    ogTitle: String | null,
    ogDescription: String | null,
    ogImage: String | null,
    noIndex: Boolean
  },

  createdBy: ObjectId,
  updatedBy: ObjectId,

  publishedAt: Date | null,
  publishedBy: ObjectId | null,

  createdAt: Date,
  updatedAt: Date
}
```

## Indexes

```text
unique(slug)
(status, publishedAt)
```

---

# 19. CMS SECTIONS

If sections are embedded inside `cmsPages`, a separate collection is not required.

Recommended first release:

> Embed page sections inside `cmsPages`.

This keeps content retrieval simple.

A separate `cmsSections` collection should only be introduced if reusable shared blocks become a real requirement.

---

# 20. BLOGS

Collection:

```text
blogs
```

Suggested:

```text
{
  _id: ObjectId,

  title: String,
  slug: String,

  excerpt: String | null,
  content: String,

  featuredMediaId: ObjectId | null,

  category: String | null,
  tags: [String],

  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",

  seo: {
    title: String | null,
    description: String | null,
    canonicalUrl: String | null,
    ogImage: String | null,
    noIndex: Boolean
  },

  authorId: ObjectId | null,

  publishedAt: Date | null,

  createdAt: Date,
  updatedAt: Date
}
```

## Indexes

```text
unique(slug)
(status, publishedAt)
(tags)
```

---

# 21. FAQS

Collection:

```text
faqs
```

Suggested:

```text
{
  _id: ObjectId,

  propertyId: ObjectId | null,

  question: String,
  answer: String,

  category: String | null,

  sortOrder: Number,

  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",

  createdBy: ObjectId,
  updatedBy: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

```text
(propertyId, status, sortOrder)
```

---

# 22. OFFERS

Collection:

```text
offers
```

Suggested:

```text
{
  _id: ObjectId,

  propertyId: ObjectId,

  title: String,
  slug: String,

  description: String,

  mediaId: ObjectId | null,

  validFrom: Date | null,
  validUntil: Date | null,

  bookingCode: String | null,

  ctaLabel: String | null,

  status: "DRAFT" | "PUBLISHED" | "ARCHIVED",

  seo: {
    title: String | null,
    description: String | null
  },

  createdAt: Date,
  updatedAt: Date
}
```

Offer presentation and coupon logic should remain separate unless explicitly linked.

---

# 23. MEDIA

Collection:

```text
media
```

Suggested:

```text
{
  _id: ObjectId,

  provider: "CLOUDINARY" | "S3",

  providerKey: String,
  url: String,

  mimeType: String,
  width: Number | null,
  height: Number | null,

  title: String | null,
  altText: String | null,

  folder: String | null,

  uploadedBy: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

Binary files should live in the external media provider.

---

# 24. SITE SETTINGS

Collection:

```text
siteSettings
```

Recommended single document:

```text
{
  _id: ObjectId,

  propertyId: ObjectId,

  brand: {
    name: String,
    logoMediaId: ObjectId | null,
    faviconMediaId: ObjectId | null
  },

  contact: {
    email: String | null,
    phone: String | null,
    address: String | null
  },

  socialLinks: [
    {
      platform: String,
      url: String
    }
  ],

  footer: {
    text: String | null
  },

  defaultSeo: {
    title: String | null,
    description: String | null,
    ogImage: String | null
  },

  updatedBy: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

---

# 25. EMAIL TEMPLATES

Collection:

```text
emailTemplates
```

Suggested:

```text
{
  _id: ObjectId,

  key: String,

  subject: String,

  htmlBody: String,
  textBody: String | null,

  variables: [String],

  status: "ACTIVE" | "INACTIVE",

  updatedBy: ObjectId,

  createdAt: Date,
  updatedAt: Date
}
```

Example keys:

```text
BOOKING_RECEIVED
BOOKING_CONFIRMED
PAYMENT_FAILED
BOOKING_CANCELLED
CHECKIN_REMINDER
CHECKED_IN
CHECKED_OUT
REFUND_UPDATE
```

---

# 26. NOTIFICATIONS

Collection:

```text
notifications
```

Suggested:

```text
{
  _id: ObjectId,

  type: "EMAIL",

  event:
    "BOOKING_RECEIVED"
    | "BOOKING_CONFIRMED"
    | "PAYMENT_FAILED"
    | "BOOKING_CANCELLED"
    | "CHECKIN_REMINDER"
    | "CHECKED_IN"
    | "CHECKED_OUT"
    | "REFUND_UPDATE",

  recipientEmail: String,

  userId: ObjectId | null,
  bookingId: ObjectId | null,

  status: "PENDING" | "PROCESSING" | "SENT" | "FAILED",

  providerMessageId: String | null,

  attempts: Number,

  lastError: String | null,

  scheduledFor: Date | null,
  sentAt: Date | null,

  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

```text
(status, scheduledFor)
(bookingId, createdAt)
(recipientEmail, createdAt)
```

---

# 27. AUDIT LOGS

Collection:

```text
auditLogs
```

Suggested:

```text
{
  _id: ObjectId,

  actorId: ObjectId | null,
  actorRole: String | null,

  action: String,

  entityType: String,
  entityId: ObjectId | String,

  before: Object | null,
  after: Object | null,

  metadata: Object | null,

  ipAddress: String | null,
  userAgent: String | null,

  createdAt: Date
}
```

Do not store sensitive secrets or unnecessary payment data.

Indexes:

```text
(entityType, entityId, createdAt)
(actorId, createdAt)
(action, createdAt)
```

---

# 28. WEBHOOK EVENTS

Collection:

```text
webhookEvents
```

Purpose:

Idempotency and audit for provider webhooks.

Suggested:

```text
{
  _id: ObjectId,

  provider: "STRIPE",

  eventId: String,

  eventType: String,

  status: "RECEIVED" | "PROCESSED" | "FAILED",

  attempts: Number,

  lastError: String | null,

  processedAt: Date | null,

  createdAt: Date,
  updatedAt: Date
}
```

Indexes:

```text
unique(provider, eventId)
(status, createdAt)
```

---

# 29. RELATIONSHIP MAP

```text
Property
  │
  ├── RoomTypes
  │      │
  │      ├── Rooms
  │      │
  │      └── RatePlans
  │
  ├── AvailabilityBlocks
  │
  ├── Bookings
  │      │
  │      ├── BookingItems
  │      │      ├── RoomType
  │      │      ├── Room
  │      │      └── RatePlan
  │      │
  │      ├── Payments
  │      │      └── Refunds
  │      │
  │      └── Notifications
  │
  └── CMS
         ├── Pages
         ├── Blogs
         ├── FAQs
         ├── Offers
         ├── Media
         └── Site Settings
```

---

# 30. BOOKING INVENTORY RELATIONSHIP

```text
Room Type
   │
   ├── Room 101
   ├── Room 102
   └── Room 103

Booking Item
   │
   └── Room 101
        │
        └── Check-in / Check-out
```

The system must know which physical inventory is consumed by a confirmed booking.

---

# 31. Historical Snapshot Rule

Booking documents must preserve historical values.

Examples:

- room name;
- room number;
- rate-plan name;
- nightly prices;
- subtotal;
- taxes;
- fees;
- discounts;
- currency.

If an admin later changes:

```text
Deluxe Room → Premium Deluxe Room
```

an old booking must still show the original booked name.

---

# 32. MONEY REPRESENTATION

Use integer minor units where practical.

Example:

```text
₹1,250.50
```

could be stored as:

```text
125050
```

if currency uses two decimal places.

The exact currency/minor-unit implementation must be consistent throughout the backend.

Never use floating-point arithmetic for authoritative money calculations without a deliberate precision strategy.

---

# 33. DATE/TIME RULES

Store dates/timestamps consistently in UTC at the persistence layer where possible.

Interpret booking dates using the property's configured timezone.

For hotel nights:

```text
Check-in 2026-10-10
Check-out 2026-10-12
```

means nights:

```text
10th
11th
```

Check-out date is exclusive for availability overlap.

---

# 34. API DESIGN PRINCIPLES

1. REST-style resource boundaries.
2. JSON request/response.
3. Version API if required, e.g. `/api/v1`.
4. Consistent success/error envelope.
5. Pagination for large lists.
6. Server-side filtering.
7. Server-side sorting.
8. Authentication middleware.
9. Role/permission middleware.
10. Request validation.
11. Stable error codes.
12. No sensitive fields in responses.

---

# 35. STANDARD API RESPONSE

Successful response:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error response:

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

The exact envelope can be simplified, but it must remain consistent.

---

# 36. PAGINATION

Recommended query:

```text
?page=1&limit=20
```

Response:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 120,
    "totalPages": 6
  }
}
```

Maximum `limit` must be enforced server-side.

Cursor pagination may be used for very large datasets.

---

# 37. PUBLIC API

## Property

```http
GET /api/public/property
```

Returns:

- property name;
- description;
- location;
- contact;
- basic public information.

No private/admin information.

---

## Room Types

```http
GET /api/public/room-types
GET /api/public/room-types/:slug
```

Query examples:

```text
?guests=2
?checkIn=2026-10-10&checkOut=2026-10-12
```

---

## Availability

```http
POST /api/public/availability/search
```

Request:

```json
{
  "checkIn": "2026-10-10",
  "checkOut": "2026-10-12",
  "adults": 2,
  "children": 0,
  "rooms": 1
}
```

Response should contain:

- available room types;
- applicable rates;
- price summary;
- availability metadata.

Search response is not a reservation.

---

# 38. CUSTOMER AUTH API

## Register

```http
POST /api/auth/register
```

Request:

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "email": "john@example.com",
  "password": "********"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "...",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  }
}
```

Never return password/hash.

---

## Login

```http
POST /api/auth/login
```

Request:

```json
{
  "email": "john@example.com",
  "password": "********"
}
```

---

## Logout

```http
POST /api/auth/logout
```

---

## Forgot Password

```http
POST /api/auth/forgot-password
```

Request:

```json
{
  "email": "john@example.com"
}
```

Response should avoid revealing whether an account exists.

---

## Reset Password

```http
POST /api/auth/reset-password
```

Request:

```json
{
  "token": "...",
  "password": "********"
}
```

---

# 39. CUSTOMER ACCOUNT API

```http
GET /api/me
PATCH /api/me
GET /api/me/bookings
GET /api/me/bookings/:id
POST /api/me/bookings/:id/cancel
```

Authorization:

```text
Authenticated customer
```

Customer must not access another user's booking ID.

---

# 40. BOOKING API

## Create Booking

```http
POST /api/bookings
```

Request concept:

```json
{
  "roomTypeId": "...",
  "roomId": "...",
  "ratePlanId": "...",
  "checkIn": "2026-10-10",
  "checkOut": "2026-10-12",
  "guests": {
    "adults": 2,
    "children": 0
  },
  "contact": {
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+91..."
  },
  "couponCode": "WELCOME"
}
```

Backend must:

1. authenticate where required;
2. validate dates;
3. validate occupancy;
4. validate room/rate;
5. recalculate pricing;
6. recheck availability;
7. create hold/booking intent;
8. create payment context;
9. return safe payment information.

Client-submitted total is ignored as authoritative.

---

# 41. BOOKING DETAILS

```http
GET /api/bookings/:id
```

Access:

- booking owner;
- authorized admin.

---

# 42. CANCEL BOOKING

```http
POST /api/bookings/:id/cancel
```

Request:

```json
{
  "reason": "Change of plans"
}
```

Backend checks:

- ownership/authorization;
- booking status;
- cancellation policy;
- payment/refund state.

---

# 43. PAYMENT API

## Create Payment Context

```http
POST /api/payments/create
```

Request:

```json
{
  "bookingId": "..."
}
```

The backend verifies the booking before creating payment context.

Response contains only safe Stripe client-side data.

---

# 44. STRIPE WEBHOOK

```http
POST /api/webhooks/stripe
```

No normal customer authentication.

Security:

- raw request body handling as required by Stripe;
- signature verification;
- idempotency;
- event logging.

Supported events must be explicitly listed in the implementation.

---

# 45. ADMIN DASHBOARD API

```http
GET /api/admin/dashboard
```

Response may contain:

```json
{
  "bookings": {
    "total": 100,
    "upcoming": 12
  },
  "checkIns": 3,
  "checkOuts": 2,
  "payments": {
    "today": 250000
  },
  "occupancy": {
    "percentage": 72
  }
}
```

Exact metrics are implementation-configurable.

---

# 46. ADMIN ROOM API

```http
GET    /api/admin/room-types
POST   /api/admin/room-types
GET    /api/admin/room-types/:id
PATCH  /api/admin/room-types/:id

GET    /api/admin/rooms
POST   /api/admin/rooms
GET    /api/admin/rooms/:id
PATCH  /api/admin/rooms/:id
```

Delete should normally be replaced by disable/archive when historical references exist.

---

# 47. ADMIN RATE PLAN API

```http
GET    /api/admin/rate-plans
POST   /api/admin/rate-plans
GET    /api/admin/rate-plans/:id
PATCH  /api/admin/rate-plans/:id
```

Authorization:

```text
ADMIN / MANAGER / SUPER_ADMIN
```

or final configured permission.

---

# 48. ADMIN AVAILABILITY API

```http
GET    /api/admin/availability
POST   /api/admin/availability/blocks
DELETE /api/admin/availability/blocks/:id
```

Block request:

```json
{
  "roomId": "...",
  "startDate": "2026-10-10",
  "endDate": "2026-10-12",
  "reason": "Maintenance"
}
```

---

# 49. ADMIN BOOKING API

```http
GET   /api/admin/bookings
GET   /api/admin/bookings/:id
PATCH /api/admin/bookings/:id/status
POST  /api/admin/bookings/:id/cancel
POST  /api/admin/bookings/:id/check-in
POST  /api/admin/bookings/:id/check-out
```

Status transitions must be validated by domain logic.

---

# 50. ADMIN CUSTOMER API

```http
GET /api/admin/customers
GET /api/admin/customers/:id
GET /api/admin/customers/:id/bookings
```

Do not return sensitive authentication/payment information.

---

# 51. ADMIN PAYMENT API

```http
GET /api/admin/payments
GET /api/admin/payments/:id
GET /api/admin/payments/:id/refunds
```

---

# 52. ADMIN COUPON API

```http
GET    /api/admin/coupons
POST   /api/admin/coupons
GET    /api/admin/coupons/:id
PATCH  /api/admin/coupons/:id
```

Customer validation:

```http
POST /api/coupons/validate
```

The final discount is always calculated again during booking.

---

# 53. CMS ADMIN API

## Pages

```http
GET    /api/admin/cms/pages
POST   /api/admin/cms/pages
GET    /api/admin/cms/pages/:id
PATCH  /api/admin/cms/pages/:id
POST   /api/admin/cms/pages/:id/publish
POST   /api/admin/cms/pages/:id/archive
```

## Blogs

```http
GET    /api/admin/cms/blogs
POST   /api/admin/cms/blogs
GET    /api/admin/cms/blogs/:id
PATCH  /api/admin/cms/blogs/:id
POST   /api/admin/cms/blogs/:id/publish
POST   /api/admin/cms/blogs/:id/archive
```

## FAQs

```http
GET    /api/admin/cms/faqs
POST   /api/admin/cms/faqs
PATCH  /api/admin/cms/faqs/:id
POST   /api/admin/cms/faqs/:id/publish
```

## Offers

```http
GET    /api/admin/cms/offers
POST   /api/admin/cms/offers
PATCH  /api/admin/cms/offers/:id
POST   /api/admin/cms/offers/:id/publish
```

## Media

```http
GET  /api/admin/cms/media
POST /api/admin/cms/media
DELETE /api/admin/cms/media/:id
```

Deletion must check references where necessary.

---

# 54. PUBLIC CMS API

```http
GET /api/public/cms/pages/:slug
GET /api/public/cms/blogs
GET /api/public/cms/blogs/:slug
GET /api/public/cms/faqs
GET /api/public/cms/offers
GET /api/public/cms/gallery
GET /api/public/cms/settings
```

Only public/published content is returned.

---

# 55. ADMIN SETTINGS API

```http
GET   /api/admin/settings
PATCH /api/admin/settings
```

Authorization:

```text
SUPER_ADMIN / ADMIN
```

depending on final permission matrix.

---

# 56. ERROR CODE CATALOG

Recommended stable error codes:

```text
AUTH_INVALID_CREDENTIALS
AUTH_UNAUTHORIZED
AUTH_FORBIDDEN
AUTH_SESSION_EXPIRED

VALIDATION_ERROR

ROOM_NOT_FOUND
ROOM_INACTIVE
ROOM_UNAVAILABLE
ROOM_CAPACITY_EXCEEDED

RATE_NOT_FOUND
RATE_INACTIVE
RATE_NOT_APPLICABLE

BOOKING_NOT_FOUND
BOOKING_INVALID_STATE
BOOKING_CANCEL_NOT_ALLOWED
BOOKING_HOLD_EXPIRED
BOOKING_ALREADY_CANCELLED

PAYMENT_NOT_FOUND
PAYMENT_FAILED
PAYMENT_NOT_CONFIRMED
PAYMENT_ALREADY_PROCESSED

REFUND_FAILED

COUPON_INVALID
COUPON_EXPIRED
COUPON_USAGE_LIMIT_REACHED

CMS_NOT_FOUND
CMS_NOT_PUBLISHED

RESOURCE_CONFLICT
RATE_LIMITED

INTERNAL_ERROR
```

The final catalog may be extended without changing existing meanings.

---

# 57. API AUTHORIZATION MATRIX

| Area | Customer | Editor | Manager | Admin | Super Admin |
|---|---:|---:|---:|---:|---:|
| Own profile | Yes | No | No | No | No |
| Own bookings | Yes | No | No | No | No |
| Public content | Public | Public | Public | Public | Public |
| CMS draft | No | Yes | Yes | Yes | Yes |
| CMS publish | No | Configurable | Yes | Yes | Yes |
| Rooms | No | No | Yes | Yes | Yes |
| Rates | No | No | Yes | Yes | Yes |
| Availability | No | No | Yes | Yes | Yes |
| Reservations | Own | No | Yes | Yes | Yes |
| Payments | Own | No | View | View | Full |
| Customers | Own | No | View | Manage | Full |
| Admin users | No | No | No | Configurable | Yes |
| System settings | No | No | Limited | Yes | Yes |

This matrix is a baseline and must be finalized with the client.

---

# 58. API VALIDATION RULES

## Dates

```text
checkIn required
checkOut required
checkOut > checkIn
```

## Guests

```text
adults >= 1
children >= 0
```

Capacity must be validated against room type.

## Email

Must pass standard normalized email validation.

## Password

Must meet the agreed minimum security policy.

## Money

Must be numeric integer minor units at the authoritative calculation layer.

## IDs

Must be valid ObjectId/expected identifier format.

## Slugs

Must be normalized and unique within their relevant scope.

---

# 59. SECURITY API RULES

Every protected endpoint must:

1. Authenticate the request.
2. Authorize the action.
3. Validate request input.
4. Apply domain rules.
5. Return only permitted data.

Never rely on:

```text
Frontend button hidden = authorization
```

The backend remains authoritative.

---

# 60. API RATE LIMITING

Apply rate limits to:

```text
/auth/login
/auth/register
/auth/forgot-password
/availability/search
/coupons/validate
/payments/create
```

More restrictive limits should be used for authentication and password-reset endpoints.

---

# 61. API IDEMPOTENCY

Potentially retried operations should support idempotency where necessary.

Candidates:

```text
POST /api/bookings
POST /api/payments/create
POST /api/bookings/:id/cancel
POST /api/webhooks/stripe
```

The exact idempotency implementation may use an idempotency key or provider event ID.

---

# 62. API QUERY FILTERING

Admin list endpoints should support controlled filtering.

Example:

```text
GET /api/admin/bookings
  ?status=CONFIRMED
  &paymentStatus=PAID
  &checkInFrom=2026-10-01
  &checkInTo=2026-10-31
  &page=1
  &limit=20
```

Only whitelisted filter fields may be queried.

---

# 63. API SORTING

Example:

```text
?sortBy=createdAt
&sortOrder=desc
```

The server must whitelist sortable fields.

Never allow arbitrary MongoDB field/operator injection through query parameters.

---

# 64. API RESPONSE DATA MINIMIZATION

Customer API should not expose:

- password hash;
- internal admin notes;
- staff-only audit information;
- provider secrets;
- unnecessary internal IDs.

Admin APIs should expose only what the user's permission requires.

Public APIs should expose only public content.

---

# 65. Database Index Checklist

Before production verify indexes for:

```text
users.normalizedEmail

properties.slug

roomTypes.propertyId + slug
roomTypes.propertyId + status

rooms.propertyId + roomNumber
rooms.propertyId + roomTypeId + status

ratePlans.propertyId + roomTypeId + status

availabilityBlocks.roomId + startDate + endDate

bookings.bookingNumber
bookings.userId + createdAt
bookings.propertyId + status + checkIn
bookings.paymentStatus + createdAt

bookingItems.bookingId
bookingItems.roomId + checkIn + checkOut

payments.bookingId
payments.providerPaymentIntentId

refunds.providerRefundId

coupons.propertyId + normalizedCode

cmsPages.slug
cmsPages.status + publishedAt

blogs.slug
blogs.status + publishedAt

notifications.status + scheduledFor

webhookEvents.provider + eventId
```

The final physical index strategy should be verified against real query patterns.

---

# 66. Data Retention & Deletion

Business records should not be casually hard-deleted.

Prefer:

```text
ACTIVE
INACTIVE
ARCHIVED
```

where history matters.

Examples:

- rooms;
- bookings;
- payments;
- refunds;
- CMS content;
- audit logs.

User deletion must be designed carefully so historical bookings retain required business records without retaining unnecessary personal data.

---

# 67. API Acceptance Checklist

## Customer

- [ ] Register works.
- [ ] Login works.
- [ ] Logout works.
- [ ] Password reset works.
- [ ] Profile works.
- [ ] Availability search works.
- [ ] Booking creation validates availability.
- [ ] Booking details are protected.
- [ ] Cancellation validates policy.

## Payment

- [ ] Payment context creation is server-authorized.
- [ ] Stripe webhook verifies signature.
- [ ] Duplicate event is safe.
- [ ] Payment state is persisted.
- [ ] Booking confirmation is synchronized with trusted payment state.

## Admin

- [ ] Admin authorization is server-side.
- [ ] Room CRUD works.
- [ ] Rate plan CRUD works.
- [ ] Availability blocks work.
- [ ] Reservation management works.
- [ ] Customer access is permission-controlled.
- [ ] Payment records are visible.
- [ ] CMS APIs work.

## Public

- [ ] Public APIs expose only published content.
- [ ] Public room data contains no private information.
- [ ] CMS slug resolution works.
- [ ] SEO metadata is returned.

---

# 68. Implementation Notes for Coding Agents

Before creating schemas or routes:

1. Read the PRD.
2. Read the Scope & Acceptance document.
3. Read the User Flows.
4. Read the System Architecture.
5. Read this database/API specification.
6. Do not invent new booking states without updating documentation.
7. Do not create multi-hotel logic.
8. Do not put payment secrets in frontend code.
9. Do not trust frontend pricing.
10. Do not bypass booking availability checks.
11. Do not directly expose MongoDB documents as public API contracts.
12. Keep provider integrations behind service boundaries.
13. Preserve historical booking snapshots.
14. Add indexes for actual query patterns.
15. Add tests for every critical state transition.

---

# 69. Decisions Required Before Final Schema Freeze

Confirm before production implementation:

1. Unified users vs separate adminUsers collection.
2. Whether guest checkout is allowed.
3. Exact room assignment timing.
4. Whether one booking can contain multiple rooms.
5. Exact rate-plan restrictions.
6. Tax calculation model.
7. Fee calculation model.
8. Currency.
9. Property timezone.
10. Cancellation policy model.
11. Whether cancellation policies should be database entities.
12. Exact coupon usage rules.
13. Final admin roles.
14. Whether reviews are included.
15. Whether CMS page sections are embedded only.
16. Exact Stripe integration mode.
17. Email provider.
18. Redis/queue provider.
19. Media provider.
20. Production retention requirements.

---

# 70. Final Database/API Statement

> The backend data model is designed around a single-property hospitality domain with room types, physical rooms, rate plans, availability, bookings, payments, refunds, customer accounts, CMS content and notifications. APIs expose separate public, customer, administrative and webhook boundaries. Booking and payment data remain authoritative on the server, historical reservation values are snapshotted, external payment/email/media providers are represented by references and adapters, and critical operations are protected through validation, authorization, idempotency and appropriate database indexes.

**End of Database & API Specification**
