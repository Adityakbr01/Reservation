# 07_ADMIN_MANAGEMENT_SPEC.md

# Admin & Management Panel Specification

**Project:** Single-Property Hotel Reservation Platform  
**Document:** 07 — Admin & Management Panel  
**Status:** Development Specification  
**Audience:** Backend developers, admin frontend developers, QA, AI coding agents  
**Depends on:** 01 Project Requirements PRD, 02 Scope & Acceptance, 03 User Flows, 04 System Architecture, 05 Database & API Specification, 06 Reservation Payment & Email Business Logic

---

# 1. Purpose

This document defines the complete behavior of the internal Management/Admin Web App.

The Management App is the operational control center for the hotel/property.

It is responsible for:

- authentication
- authorization
- dashboard
- reservations
- room types
- physical rooms
- rate plans
- availability blocks
- customers
- payments
- refunds
- coupons/offers
- check-in/check-out
- CMS
- media
- site settings
- email/notification visibility
- audit logs
- operational search/filtering
- administrative actions

This is an internal application.

It must not be confused with:

- the public marketing website
- the customer reservation frontend
- a multi-hotel marketplace
- a property-owner/vendor marketplace

There is one property with multiple physical rooms.

---

# 2. Admin Application Boundary

Recommended application structure:

```text
apps/
├── website/
├── reservation/
├── management/
└── shared/

server/
└── Express API
```

The management app communicates with the same backend API used by the reservation system, but with protected admin endpoints and role-based authorization.

---

# 3. Admin Roles

Recommended role model:

```text
super_admin
admin
manager
editor
```

A `customer` role belongs to the customer application and must not automatically receive management access.

The exact role names can be changed, but the permission model must remain explicit.

---

# 4. Role Responsibilities

## 4.1 Super Admin

Full system access.

Can:

- manage admins
- manage roles
- manage property settings
- manage rooms
- manage rates
- manage reservations
- manage payments/refunds
- manage CMS
- manage media
- manage coupons
- view audit logs
- change security-sensitive settings

---

## 4.2 Admin

Broad operational access.

Can generally:

- manage reservations
- manage rooms
- manage customers
- manage payments
- process refunds if authorized
- manage coupons
- manage CMS
- manage media
- perform check-in/check-out

Admin management permissions may remain restricted to super admin.

---

## 4.3 Manager

Operational management.

Typical access:

- dashboard
- reservations
- availability
- rooms
- customers
- check-in/check-out
- payment visibility
- operational reports

May be restricted from:

- security settings
- admin account management
- destructive configuration
- sensitive CMS/site settings

---

## 4.4 Editor

Content-focused role.

Can manage:

- CMS pages
- blogs
- FAQs
- offers
- media
- SEO content

Should not automatically be able to:

- refund payments
- cancel bookings
- change room inventory
- manage admins
- change security settings

---

# 5. Permission Model

Permissions should be explicit rather than relying only on role names.

Recommended permission identifiers:

```text
dashboard.view

reservations.view
reservations.create
reservations.update
reservations.cancel
reservations.checkin
reservations.checkout

rooms.view
rooms.create
rooms.update
rooms.disable

room_types.view
room_types.create
room_types.update

rates.view
rates.create
rates.update

availability.view
availability.manage

customers.view
customers.update

payments.view
payments.refund

coupons.view
coupons.create
coupons.update
coupons.disable

cms.view
cms.create
cms.update
cms.publish
cms.archive

media.view
media.upload
media.delete

settings.view
settings.update

admins.view
admins.create
admins.update
admins.disable

audit_logs.view
```

Backend authorization must check permissions.

Frontend hiding a button is not sufficient.

---

# 6. Admin Authentication

Admin login:

```text
Email
Password
```

Recommended:

- secure HTTP-only authentication cookie
- short-lived access/session mechanism
- secure refresh strategy if used
- CSRF protection where applicable
- rate limiting
- account lock/risk controls
- password hashing
- logout/session invalidation

---

# 7. Admin Login Flow

```text
Open Management App
        ↓
Login page
        ↓
Enter email/password
        ↓
POST /admin/auth/login
        ↓
Backend validates credentials
        ↓
Session established
        ↓
Load current admin + permissions
        ↓
Redirect to Dashboard
```

If already authenticated:

```text
/login → dashboard
```

If unauthenticated:

```text
protected route → /login
```

---

# 8. Admin Session Rules

The frontend should not rely only on local storage for authorization.

Every protected API request must be authenticated by the backend.

Admin session should support:

- logout
- expiration
- invalidation
- permission refresh
- revoked account handling

If an admin is disabled:

```text
future requests → 401/403
```

---

# 9. Management App Navigation

Recommended navigation:

```text
Dashboard

Reservations
  ├── All Reservations
  ├── Today
  ├── Upcoming
  ├── Check-ins
  └── Check-outs

Rooms
  ├── Room Types
  ├── Physical Rooms
  ├── Availability
  └── Blocks

Rates
  ├── Rate Plans
  └── Pricing Calendar

Customers

Payments
  ├── Transactions
  └── Refunds

Coupons / Offers

CMS
  ├── Pages
  ├── Blogs
  ├── FAQs
  ├── Offers
  ├── Media
  └── SEO

Settings

Audit Logs

Admin Users
```

Navigation must be permission-aware.

---

# 10. Dashboard

The dashboard provides an operational summary.

Recommended cards:

```text
Today's Arrivals
Today's Departures
Current Guests
Upcoming Reservations
Pending Payments
Payment Failures
Today's Booking Value
Upcoming Check-ins
```

Exact financial labels must be defined carefully.

Do not call gross booking value "revenue" unless accounting meaning is agreed.

---

# 11. Dashboard Reservation Metrics

Possible metrics:

```text
Total bookings today
Confirmed bookings
Pending payments
Cancelled bookings
Today's check-ins
Today's check-outs
Upcoming arrivals
Upcoming departures
```

Dashboard should use backend aggregation endpoints rather than downloading all bookings to the browser.

---

# 12. Dashboard Occupancy

If occupancy is included:

```text
occupied rooms
available rooms
blocked rooms
occupancy percentage
```

Example:

```text
Total active rooms: 20
Occupied: 12
Blocked: 2
Available: 6
```

Occupancy calculation must be documented and consistent.

---

# 13. Dashboard Alerts

Surface operational issues such as:

```text
Payment failures
Stale payment-pending bookings
Refunds pending
Email failures
Rooms blocked
Upcoming check-ins
Bookings requiring attention
```

Critical alerts should link directly to the relevant record.

---

# 14. Reservation Management

Primary route:

```text
/admin/reservations
```

Capabilities:

- list
- search
- filter
- sort
- inspect
- cancel
- check-in
- check-out
- room reassignment if permitted
- payment inspection
- refund if permitted
- customer inspection

---

# 15. Reservation List

Recommended columns:

```text
Booking Reference
Guest
Stay Dates
Room
Guests
Booking Status
Payment Status
Total
Created At
Actions
```

Avoid excessive columns.

Use a details drawer/page for full information.

---

# 16. Reservation Filters

Recommended filters:

```text
status
paymentStatus
checkIn date
checkOut date
created date
roomType
physicalRoom
guest
bookingReference
```

Quick filters:

```text
Today
Tomorrow
This Week
Upcoming
Pending Payment
Confirmed
Checked In
Checked Out
Cancelled
```

---

# 17. Reservation Search

Search by:

```text
booking reference
guest name
email
phone
room number
```

Search should be server-side.

Debounce text search on frontend.

---

# 18. Reservation Detail Page

Recommended sections:

```text
Booking Header
Guest Information
Stay Information
Room Allocation
Pricing
Payment
Cancellation / Refund
Timeline
Notes
Audit History
```

---

# 19. Booking Header

Show:

```text
Booking Reference
Booking Status
Payment Status
Created At
Source
```

Example:

```text
QB-7F3K92
CONFIRMED
PAID
Created: Oct 3, 2026 11:42 AM
Source: Website
```

---

# 20. Guest Information

Show:

```text
Name
Email
Phone
Number of Adults
Number of Children
Special Requests
```

Personal data should be displayed only to authorized staff.

---

# 21. Stay Information

Show:

```text
Check-in
Check-out
Number of nights
Room type
Physical room
Rate plan
```

---

# 22. Pricing Section

Show a clear breakdown:

```text
Room subtotal
Discount
Taxes
Fees
Total
Amount paid
Refunded
Outstanding
Currency
```

Use server-calculated values.

---

# 23. Payment Section

Show:

```text
Payment status
Provider
Payment reference
Stripe PaymentIntent ID where operationally useful
Amount
Currency
Created time
Paid time
Failure reason if applicable
Refund status
```

Sensitive card data must never be displayed.

---

# 24. Reservation Timeline

Example:

```text
Booking created
↓
Room held
↓
Payment pending
↓
Payment successful
↓
Booking confirmed
↓
Check-in
↓
Check-out
```

Timeline events should be derived from audit/domain events where possible.

---

# 25. Reservation Actions

Available actions depend on state and permissions.

Examples:

```text
Cancel Booking
Check In
Check Out
Change Room
Process Refund
Retry/Review Payment
```

Do not show impossible actions.

More importantly, backend must reject impossible actions even if manually requested.

---

# 26. Cancellation Action

Admin clicks:

```text
Cancel Booking
```

Modal should show:

```text
Booking reference
Guest
Dates
Current payment status
Cancellation policy
Expected refund
```

Require confirmation.

If refund applies:

```text
Refund amount
Refund method
```

must be clearly displayed.

---

# 27. Check-In Action

Before allowing check-in:

- booking exists
- booking is confirmed
- required payment conditions are satisfied
- date/policy permits check-in
- booking is not cancelled
- booking is not already checked in

Confirmation modal:

```text
Confirm check-in for QB-7F3K92?
```

Record actor and timestamp.

---

# 28. Check-Out Action

Before allowing checkout:

- booking is checked in
- booking is not already checked out

Record:

```text
checkedOutAt
checkedOutBy
```

---

# 29. Room Reassignment

Admin may reassign room if permission exists.

Flow:

```text
Current Room
     ↓
Change Room
     ↓
Select available room
     ↓
Backend revalidates availability
     ↓
Atomic reassignment
     ↓
Audit event
```

Never rely on the availability shown in the UI alone.

---

# 30. Room Type Management

Route:

```text
/admin/room-types
```

Room type represents the sellable category.

Fields may include:

```text
name
slug
description
shortDescription
maxAdults
maxChildren
maxOccupancy
bedConfiguration
amenities
images
status
sortOrder
```

---

# 31. Room Type Status

Recommended:

```text
DRAFT
ACTIVE
INACTIVE
```

Inactive room types should not appear in customer availability.

Existing historical bookings must preserve their snapshot.

---

# 32. Room Type Creation

Admin enters:

```text
Name
Description
Occupancy
Beds
Amenities
Images
Status
```

Backend validates:

- unique slug
- valid occupancy
- required fields
- image references
- valid status

---

# 33. Physical Room Management

Route:

```text
/admin/rooms
```

Each physical room includes:

```text
roomNumber
roomTypeId
floor
status
notes
```

Status examples:

```text
ACTIVE
OUT_OF_SERVICE
INACTIVE
```

---

# 34. Room Number Uniqueness

Room number should be unique within the property.

Do not allow:

```text
Room 101
Room 101
```

unless a deliberate internal identifier model supports it.

---

# 35. Out-of-Service Rooms

An out-of-service room:

```text
cannot be allocated
```

but existing historical bookings should not be silently changed.

If a currently booked room becomes out of service:

```text
admin must resolve affected reservations
```

through a controlled reassignment workflow.

---

# 36. Availability Calendar

Route:

```text
/admin/availability
```

Recommended calendar views:

```text
Day
Week
Month
```

Rows:

```text
physical rooms
```

Columns:

```text
dates
```

Booking blocks show:

```text
guest
booking reference
status
```

---

# 37. Availability Calendar Actions

Authorized staff may:

- view booking occupancy
- create room block
- remove room block
- inspect booking
- navigate dates
- filter room type

Any destructive action requires confirmation.

---

# 38. Availability Blocks

Create:

```text
Room
Start date
End date
Reason
Notes
```

Example:

```text
Room 103
Oct 10 → Oct 15
Reason: Maintenance
```

Backend must prevent invalid date ranges.

---

# 39. Block Conflict Rules

Creating a block should warn if:

```text
existing confirmed booking overlaps
```

The system must not silently invalidate a customer's confirmed reservation.

Admin should be required to resolve the conflict.

---

# 40. Rate Plan Management

Route:

```text
/admin/rates
```

Rate plan fields:

```text
name
code
description
roomType
pricing
cancellationPolicy
mealInclusion
minStay
maxStay
bookingWindow
activeDateRange
status
```

---

# 41. Rate Plan Status

Recommended:

```text
DRAFT
ACTIVE
INACTIVE
```

Inactive rates should not be selectable for new customer bookings.

Existing bookings retain their historical rate snapshot.

---

# 42. Pricing Calendar

Admin may need a calendar for nightly pricing.

Example:

```text
Oct 10 → ₹4,000
Oct 11 → ₹4,500
Oct 12 → ₹4,000
```

Changes should apply only to future eligible bookings.

Existing booking totals must remain unchanged.

---

# 43. Customer Management

Route:

```text
/admin/customers
```

List:

```text
Name
Email
Phone
Bookings
Last Booking
Account Status
Created At
```

---

# 44. Customer Detail

Show:

```text
Profile
Contact Information
Booking History
Payment Summary where authorized
Cancellation History
Account Status
```

Do not display sensitive payment credentials.

---

# 45. Customer Account Actions

Depending on permission:

```text
View
Edit allowed profile fields
Disable account
Enable account
```

Admin should not be able to view customer passwords.

---

# 46. Payment Management

Route:

```text
/admin/payments
```

List:

```text
Payment ID
Booking Reference
Guest
Amount
Currency
Status
Provider
Created At
Paid At
```

---

# 47. Payment Filters

```text
status
date range
amount range
booking reference
payment provider
```

Statuses:

```text
PENDING
PROCESSING
PAID
FAILED
REFUNDED
PARTIALLY_REFUNDED
```

---

# 48. Payment Detail

Show:

```text
Booking
Payment status
Amount
Currency
Stripe PaymentIntent
Timeline
Failure information
Refunds
```

Do not expose sensitive Stripe credentials.

---

# 49. Refund Management

Authorized users can initiate refunds.

Flow:

```text
Open payment
   ↓
Refund
   ↓
Show refundable amount
   ↓
Enter amount/reason
   ↓
Confirm
   ↓
Backend validates
   ↓
Stripe refund
   ↓
Persist refund
   ↓
Update payment state
   ↓
Audit
   ↓
Notification
```

---

# 50. Refund Rules

Backend must enforce:

```text
refundAmount > 0
refundAmount <= refundableAmount
```

Cannot refund:

```text
already fully refunded payment
```

unless a supported provider reconciliation workflow exists.

---

# 51. Coupons

Route:

```text
/admin/coupons
```

List:

```text
Code
Discount
Validity
Usage
Status
Applicable Room Types
```

---

# 52. Coupon Create/Edit

Fields:

```text
code
discountType
discountValue
startAt
endAt
minimumAmount
maximumDiscount
usageLimit
perUserLimit
applicableRoomTypes
applicableRatePlans
status
```

---

# 53. Coupon Disable

Disabling a coupon:

```text
prevents new usage
```

It must not modify historical bookings that already used the coupon.

---

# 54. CMS Overview

CMS manages content consumed by the public website.

Management sections:

```text
Pages
Blogs
FAQs
Offers
Media
SEO
Site Settings
```

The public frontend is maintained separately, but it consumes published CMS content through APIs.

---

# 55. CMS Page Lifecycle

Recommended:

```text
DRAFT
   ↓
PUBLISHED
   ↓
ARCHIVED
```

Only `PUBLISHED` content should normally be available to public APIs.

---

# 56. Page Editor

Page fields:

```text
title
slug
excerpt
content/sections
featuredImage
SEO title
SEO description
canonical URL
OG image
robots directive
status
publishedAt
```

---

# 57. CMS Sections

If reusable block content is used, supported blocks may include:

```text
Hero
SplitContent
Gallery
RoomShowcase
FeatureGrid
OfferCard
EditorialText
Testimonials
CTA
Location
FAQ
Newsletter
```

The implementation must use only blocks actually required by the public website.

Do not create a complex page-builder system unnecessarily.

---

# 58. CMS Preview

Editors should be able to preview draft content.

Preview must not accidentally publish content.

Recommended:

```text
Draft → Preview
Draft → Publish
```

separate actions.

---

# 59. Publishing

When publishing:

1. validate required fields
2. validate slug
3. validate referenced media
4. validate SEO fields where required
5. set published timestamp
6. update status
7. create audit event
8. invalidate public content cache if applicable

---

# 60. Slug Rules

Slugs should be:

- URL-safe
- unique
- lowercase
- stable where possible

Changing a published slug may require redirect support.

Do not silently break existing public URLs.

---

# 61. Blog Management

Blog fields:

```text
title
slug
excerpt
content
featuredImage
author
tags
category
SEO metadata
status
publishedAt
```

Actions:

```text
Create
Edit
Preview
Publish
Unpublish/archive
```

---

# 62. FAQ Management

FAQ fields:

```text
question
answer
category
sortOrder
status
```

Admin can:

- create
- edit
- reorder
- publish
- archive

---

# 63. Offer Management

Offers may be displayed publicly and may or may not connect to actual coupon/rate rules.

Important distinction:

```text
marketing offer
```

is not automatically:

```text
booking discount
```

If an offer provides a discount, it must reference a valid backend pricing/coupon mechanism.

---

# 64. Media Management

Route:

```text
/admin/media
```

Capabilities:

```text
upload
browse
search
filter
copy URL/reference
replace where supported
delete where safe
```

---

# 65. Media Metadata

Store:

```text
fileName
url
storageKey
mimeType
width
height
altText
caption
size
createdAt
```

Actual binary files should be stored in:

```text
Cloudinary / S3 / equivalent
```

not MongoDB.

---

# 66. Media Deletion

Before deleting media:

```text
check references
```

If used by published content:

```text
warn/block deletion
```

unless a controlled replacement workflow exists.

---

# 67. SEO Management

Admin may manage:

```text
SEO title
meta description
canonical
OG title
OG description
OG image
robots
structured-data-related fields
```

Do not expose arbitrary executable HTML/JS injection through CMS.

---

# 68. Site Settings

Recommended settings:

```text
property name
address
phone
email
timezone
currency
check-in time
check-out time
support email
social links
booking policies
```

Sensitive infrastructure secrets must not be editable as plain CMS settings.

---

# 69. Property Settings

Property configuration may include:

```text
name
description
contact details
timezone
currency
default check-in time
default check-out time
```

Changing core settings must be permission-restricted and audited.

---

# 70. Email Management

Admin may view:

```text
notifications
delivery status
failed notifications
```

Depending on scope, admin may also manage templates.

Do not give content editors access to provider credentials.

---

# 71. Notification List

Columns:

```text
Type
Recipient
Booking
Status
Attempts
Created At
Sent At
```

Statuses:

```text
QUEUED
PROCESSING
SENT
FAILED
```

---

# 72. Failed Notification Handling

Admin may see:

```text
recipient
template
error
retry count
last attempt
```

Authorized admin may trigger retry.

Retry must preserve idempotency.

---

# 73. Audit Logs

Route:

```text
/admin/audit-logs
```

Audit logs are append-oriented operational records.

Recommended fields:

```text
actorId
actorType
action
entityType
entityId
before
after
metadata
ipAddress where appropriate
userAgent where appropriate
createdAt
```

---

# 74. Audit Events

Examples:

```text
ADMIN_LOGIN
ADMIN_LOGOUT
ADMIN_CREATED
ADMIN_DISABLED

ROOM_CREATED
ROOM_UPDATED
ROOM_BLOCKED
ROOM_UNBLOCKED

RATE_CREATED
RATE_UPDATED

BOOKING_CANCELLED
BOOKING_CHECKED_IN
BOOKING_CHECKED_OUT
ROOM_REASSIGNED

PAYMENT_REFUNDED

CMS_PAGE_CREATED
CMS_PAGE_UPDATED
CMS_PAGE_PUBLISHED
CMS_PAGE_ARCHIVED

SETTINGS_UPDATED
```

---

# 75. Audit Log Rules

Audit records should not be casually editable from the UI.

Normal admins should not be able to delete audit history.

Sensitive values should be redacted.

Example:

Do not store:

```text
password
Stripe secret
reset token
```

inside `before`/`after`.

---

# 76. Admin User Management

Route:

```text
/admin/admin-users
```

Super admin only or explicitly authorized users.

List:

```text
Name
Email
Role
Status
Last Login
Created At
```

---

# 77. Admin User Creation

Fields:

```text
name
email
role
status
```

Recommended invitation flow:

```text
Create admin
   ↓
Send invitation
   ↓
Admin sets password
   ↓
Account activated
```

Do not send passwords by email.

---

# 78. Admin Disable

When admin is disabled:

```text
status = DISABLED
```

Future requests must fail authorization.

Existing sessions should be invalidated according to the authentication implementation.

---

# 79. Admin Role Changes

Role changes are security-sensitive.

Require:

- authorization
- confirmation
- audit event

A super admin should not accidentally remove their own only administrative access without safeguards.

---

# 80. Admin Data Tables

All management tables should support:

```text
server-side pagination
server-side filtering
server-side sorting
loading state
empty state
error state
```

Do not load thousands of records into the browser unnecessarily.

---

# 81. Pagination

Recommended API:

```http
GET /api/v1/admin/bookings?page=1&limit=25
```

Response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 25,
    "total": 250,
    "totalPages": 10
  }
}
```

Exact response contract must remain aligned with document 05.

---

# 82. Bulk Actions

Bulk operations should be introduced only where safe.

Potential examples:

```text
bulk archive CMS drafts
bulk enable/disable content
```

Avoid bulk financial actions unless specifically required.

Never provide unrestricted:

```text
bulk refund
bulk cancellation
```

without explicit business requirements and strong confirmation.

---

# 83. Destructive Action Confirmation

Actions such as:

```text
Cancel booking
Refund payment
Delete media
Disable room
Disable admin
Archive published content
```

must require explicit confirmation.

For high-risk actions, show:

```text
What will happen
Affected record
Financial impact
Irreversible consequences
```

---

# 84. Toasts and Feedback

After successful actions:

```text
Booking cancelled successfully
Refund initiated successfully
Room updated successfully
Page published successfully
```

Errors should use business error codes.

Example:

```text
ROOM_NO_LONGER_AVAILABLE
```

→

```text
This room is no longer available for these dates.
```

---

# 85. Forms

Admin forms should have:

- validation
- dirty state
- loading state
- disabled submit while processing
- server error display
- success feedback
- confirmation for destructive changes

Do not submit the same mutation multiple times.

---

# 86. Date/Time Display

Backend should store normalized date/time values according to the architecture.

Management UI should display values using the property's configured timezone.

For booking dates:

```text
Oct 10, 2026
```

For timestamps:

```text
Oct 3, 2026, 11:42 AM
```

Avoid inconsistent timezone interpretation between admin and reservation apps.

---

# 87. Financial Display

Always display:

```text
currency symbol
amount
```

Example:

```text
₹13,570.00
```

Do not mix currencies silently.

---

# 88. Admin API Boundary

Recommended routes:

```text
/api/v1/admin/dashboard
/api/v1/admin/reservations
/api/v1/admin/rooms
/api/v1/admin/room-types
/api/v1/admin/rates
/api/v1/admin/availability
/api/v1/admin/customers
/api/v1/admin/payments
/api/v1/admin/refunds
/api/v1/admin/coupons
/api/v1/admin/cms
/api/v1/admin/media
/api/v1/admin/settings
/api/v1/admin/audit-logs
/api/v1/admin/admin-users
```

Exact endpoint definitions belong in document 05.

---

# 89. Backend Authorization Pattern

Example:

```ts
authorize({
  resource: "reservations",
  action: "cancel"
})
```

The middleware/service should verify:

```text
authenticated
+
admin account active
+
required permission
```

For resource-specific operations, also validate state/business rules.

---

# 90. Admin Frontend Architecture

Recommended:

```text
management/
├── src/
│   ├── app/
│   ├── routes/
│   ├── layouts/
│   ├── components/
│   ├── features/
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── reservations/
│   │   ├── rooms/
│   │   ├── rates/
│   │   ├── customers/
│   │   ├── payments/
│   │   ├── coupons/
│   │   ├── cms/
│   │   ├── media/
│   │   ├── settings/
│   │   └── audit/
│   ├── lib/
│   └── types/
```

Feature-based organization is preferred over one huge components directory.

---

# 91. Admin State Management

Separate:

```text
server state
```

from:

```text
UI state
```

Server state:

- reservations
- rooms
- customers
- payments
- CMS data

UI state:

- modal open/close
- selected tab
- temporary form state
- filters

Use the project's selected query/state library consistently.

Do not duplicate server state unnecessarily in global client state.

---

# 92. Admin Route Guards

Frontend route guard:

```text
not authenticated → login
authenticated but unauthorized → forbidden
authorized → page
```

However:

```text
Frontend guard != security boundary
```

Backend authorization remains mandatory.

---

# 93. Responsive Admin UI

Management UI should work on:

```text
desktop
tablet
mobile where operationally practical
```

Desktop is the primary target.

Dense data tables may use:

```text
horizontal scroll
responsive cards
details drawer
```

rather than forcing unreadable columns.

---

# 94. Loading and Error States

Every page should define:

```text
loading
empty
error
success
```

Examples:

```text
No reservations found
No customers found
No failed payments
No audit events
```

Avoid blank screens.

---

# 95. Search Performance

Searchable fields should have indexes.

Examples:

```text
bookingReference
guest.email
guest.phone
room.roomNumber
customer.email
coupon.code
cmsPage.slug
```

Actual indexes should match document 05.

---

# 96. Caching

Safe candidates:

```text
room type metadata
published CMS content
site settings
FAQ content
```

Do not blindly cache rapidly changing:

```text
inventory
payment status
booking status
```

Availability caching must be short-lived and must never replace final validation.

---

# 97. Operational Permissions Matrix

| Capability | Super Admin | Admin | Manager | Editor |
|---|---:|---:|---:|---:|
| Dashboard | Yes | Yes | Yes | Limited |
| View Reservations | Yes | Yes | Yes | No |
| Cancel Reservation | Yes | Yes | Configurable | No |
| Check-in/out | Yes | Yes | Yes | No |
| Manage Rooms | Yes | Yes | Yes | No |
| Manage Rates | Yes | Yes | Configurable | No |
| View Customers | Yes | Yes | Yes | No |
| View Payments | Yes | Yes | Yes | No |
| Refund | Yes | Configurable | No | No |
| Coupons | Yes | Yes | Configurable | No |
| CMS Edit | Yes | Yes | No | Yes |
| CMS Publish | Yes | Yes | No | Configurable |
| Media | Yes | Yes | No | Yes |
| Settings | Yes | Configurable | No | No |
| Audit Logs | Yes | Yes | Limited | No |
| Admin Users | Yes | No | No | No |

This table is a baseline. Final permissions must be stored as explicit permission records/configuration.

---

# 98. Admin Acceptance Criteria

## Authentication

- [ ] login works
- [ ] logout works
- [ ] session expiry works
- [ ] disabled admin cannot access
- [ ] unauthorized roles are blocked

## Dashboard

- [ ] metrics load correctly
- [ ] dates use property timezone
- [ ] alerts link to relevant records

## Reservations

- [ ] search
- [ ] filtering
- [ ] pagination
- [ ] detail page
- [ ] cancellation
- [ ] check-in
- [ ] check-out
- [ ] room reassignment
- [ ] audit logging

## Rooms

- [ ] room type CRUD
- [ ] physical room management
- [ ] room status
- [ ] blocks
- [ ] availability calendar

## Rates

- [ ] rate plan management
- [ ] pricing rules
- [ ] active/inactive states
- [ ] historical booking snapshot preserved

## Customers

- [ ] customer search
- [ ] profile
- [ ] booking history
- [ ] account status

## Payments

- [ ] transaction list
- [ ] payment detail
- [ ] refund
- [ ] refund validation
- [ ] audit logging

## CMS

- [ ] page CRUD
- [ ] draft
- [ ] preview
- [ ] publish
- [ ] archive
- [ ] blogs
- [ ] FAQs
- [ ] offers
- [ ] media
- [ ] SEO

## Audit

- [ ] admin actions logged
- [ ] logs searchable
- [ ] sensitive values redacted
- [ ] logs cannot be casually deleted

---

# 99. Out-of-Scope Admin Features

Unless separately approved, do not implement:

- multi-property management
- hotel owner/vendor portals
- OTA/channel manager
- Booking.com integration
- Airbnb integration
- Expedia integration
- housekeeping task management
- maintenance workflow system
- POS
- accounting ERP
- payroll
- advanced revenue management
- dynamic AI pricing
- loyalty management
- referral management
- gift cards
- native mobile admin app
- advanced BI/data warehouse
- arbitrary custom-code CMS blocks

---

# 100. Admin Error Handling

Business errors must be translated into useful UI messages.

Example:

```text
ROOM_NO_LONGER_AVAILABLE
```

UI:

```text
This room is no longer available for the selected dates. Please refresh availability.
```

Example:

```text
BOOKING_NOT_CANCELLABLE
```

UI:

```text
This booking cannot be cancelled under the current policy.
```

Example:

```text
REFUND_ALREADY_PROCESSED
```

UI:

```text
A refund has already been processed for this payment.
```

Do not expose raw stack traces.

---

# 101. Admin Audit Example

When admin cancels booking:

```json
{
  "action": "BOOKING_CANCELLED",
  "entityType": "booking",
  "entityId": "booking_id",
  "actorId": "admin_id",
  "metadata": {
    "reason": "Customer requested cancellation",
    "refundAmount": 500000
  }
}
```

Before/after snapshots should contain only safe operational fields.

---

# 102. Admin Performance Requirements

Management app should aim for:

```text
fast initial shell load
server-side pagination
minimal unnecessary requests
debounced search
cached static metadata
lazy-loaded large CMS/media sections
```

Do not optimize prematurely at the cost of correctness.

Transactional correctness is more important than aggressive caching.

---

# 103. Admin Security Checklist

- [ ] backend RBAC
- [ ] permission checks
- [ ] secure authentication
- [ ] session invalidation
- [ ] rate limiting
- [ ] CSRF protection where applicable
- [ ] input validation
- [ ] output sanitization
- [ ] audit logs
- [ ] sensitive-data redaction
- [ ] secure cookies
- [ ] HTTPS
- [ ] restricted CORS
- [ ] no secrets in frontend
- [ ] no password visibility
- [ ] no card data storage/display

---

# 104. Admin Testing Strategy

## Unit Tests

Test:

- permission evaluation
- booking action availability
- cancellation authorization
- refund validation
- room reassignment
- CMS publication validation
- coupon admin rules

## Integration Tests

Test:

- admin login
- reservation search
- booking cancellation
- refund
- check-in
- check-out
- room reassignment
- CMS publishing
- media upload
- audit logging

## End-to-End Tests

Important journeys:

```text
Admin login
→ Dashboard
→ Reservation
→ View booking
→ Check-in
→ Check-out
```

```text
Admin
→ Payment
→ Refund
→ Verify payment state
→ Verify audit event
```

```text
Editor
→ CMS page
→ Edit
→ Preview
→ Publish
→ Verify public API
```

```text
Manager
→ Attempt admin-only action
→ Access denied
```

---

# 105. Coding-Agent Instructions

Any AI coding agent implementing the management application must:

1. Read documents `01` through `07`.
2. Treat this document as the admin application behavior contract.
3. Do not invent additional hotel marketplace functionality.
4. Do not create owner/vendor accounts.
5. Do not put authorization logic only in the frontend.
6. Every mutation must call the backend.
7. Every sensitive mutation must be permission-checked.
8. Every reservation/payment mutation must respect the state machine in document 06.
9. Every financial action must create an audit event.
10. Do not expose card data or secrets.
11. Do not allow admin UI actions that backend does not support.
12. Do not create fake dashboard metrics.
13. Do not silently modify historical bookings.
14. Do not bypass server-side pagination for large datasets.
15. Use stable API contracts from document 05.
16. Use reusable components for tables, filters, modals, forms, badges, pagination and confirmation dialogs.
17. Keep business logic in services/backend rather than React components.
18. Preserve responsive behavior.
19. Implement loading, empty, error and success states.
20. Ask/flag an open decision rather than inventing business behavior.

---

# 106. Recommended Implementation Order

### Phase 1

```text
Admin authentication
RBAC
Layout
Navigation
Route guards
```

### Phase 2

```text
Dashboard
Reservation list
Reservation detail
Reservation actions
```

### Phase 3

```text
Room types
Physical rooms
Availability calendar
Blocks
```

### Phase 4

```text
Rate plans
Pricing calendar
Coupons
```

### Phase 5

```text
Customers
Payments
Refunds
```

### Phase 6

```text
Check-in
Check-out
Room reassignment
Operational workflows
```

### Phase 7

```text
CMS
Pages
Blogs
FAQs
Offers
Media
SEO
Settings
```

### Phase 8

```text
Audit logs
Notification monitoring
Admin user management
```

### Phase 9

```text
Testing
Security hardening
Performance
Production readiness
```

---

# 107. Final Admin System Model

The management application is an operational layer over the same reservation domain:

```text
ADMIN AUTH
    ↓
PERMISSIONS
    ↓
┌──────────────────────────────────────┐
│          MANAGEMENT APP              │
├──────────────────────────────────────┤
│ Dashboard                            │
│ Reservations                         │
│ Rooms / Inventory                    │
│ Rates                                │
│ Customers                            │
│ Payments / Refunds                   │
│ Coupons                              │
│ CMS / Media / SEO                    │
│ Settings                             │
│ Audit Logs                           │
└──────────────────────────────────────┘
                    ↓
             EXPRESS API
                    ↓
       ┌────────────┼────────────┐
       ↓            ↓            ↓
    MongoDB       Redis        Stripe
       ↓
 Background Workers
       ↓
 Email / Notifications
```

The Management App must provide operational control without bypassing the domain rules defined by the reservation and payment system.

The backend remains the ultimate enforcement layer for:

```text
authorization
inventory
booking state
payment state
refunds
financial amounts
CMS publication
security
```

---

# 108. Final Definition of Done

The admin application is complete when:

```text
Admin can securely log in
        ↓
Admin sees authorized dashboard
        ↓
Admin can manage reservations
        ↓
Admin can manage room inventory
        ↓
Admin can manage rates
        ↓
Admin can inspect customers
        ↓
Admin can inspect payments
        ↓
Authorized users can process refunds
        ↓
Staff can check guests in/out
        ↓
Authorized staff can manage availability
        ↓
Editors can manage CMS
        ↓
Media can be managed safely
        ↓
Settings can be controlled
        ↓
All sensitive operations are audited
        ↓
RBAC is enforced server-side
        ↓
Critical workflows are tested
```

**End of Document**
