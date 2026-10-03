# 02 — SCOPE & ACCEPTANCE SPECIFICATION

**Project:** Single-Property Reservation & Management Platform  
**Document:** Scope, Deliverables & Acceptance Criteria  
**Status:** Development Baseline  
**Version:** 1.0  
**Companion:** `01_PROJECT_REQUIREMENTS_PRD.md`

---

## 1. Purpose

This document freezes the practical development scope.

It defines:
- included modules and functionality;
- screen/module boundaries;
- acceptance criteria;
- exclusions;
- third-party responsibility;
- client inputs;
- bug vs change-request rules;
- release readiness.

This document must be read with the PRD. An explicitly approved later change request may modify this baseline.

---

# 2. Product Scope Summary

The product is a **single-property hospitality reservation and management platform**.

The model is:

**One hotel/property → multiple room/accommodation types → multiple physical rooms → multiple rate plans.**

The platform includes:

1. Reservation / Booking Application
2. Management / Admin Panel
3. CMS
4. Shared Backend/API
5. Stripe Payment Integration
6. Transactional Email Notification System

The public/marketing landing website is developed separately by the client/company.

### Boundary

The landing website frontend is **not included**.

The backend CMS and public content APIs required to manage/supply that website's content **are included**.

---

# 3. Included Scope

## 3.1 Reservation / Booking

### Authentication
- Register
- Login
- Logout
- Forgot password
- Reset password
- Basic profile/account
- Protected booking/account routes

**Acceptance**
- Valid users can authenticate.
- Invalid credentials are rejected.
- Password reset uses a secure token/expiry mechanism.
- Users can access only their own protected account/booking data.

### Search & Availability
- Check-in
- Check-out
- Adults/children where enabled
- Room count where enabled
- Availability search
- Basic filtering/sorting
- Price display

**Acceptance**
- Check-out must be after check-in.
- Search returns only inventory that can satisfy the requested dates/occupancy.
- Overlapping confirmed/held inventory is not freely bookable.
- Search results are revalidated before final booking.

### Room / Accommodation
- Name
- Images
- Description
- Capacity
- Bed configuration
- Amenities
- Policies
- Display/base price
- Applicable rate plans

**Acceptance**
- Active/published inventory is visible.
- Disabled inventory cannot be booked.
- Backend remains authoritative for room and pricing data.

### Rate Plans & Pricing
- Base price
- Rate plans
- Rate-plan name/description
- Date validity/restrictions where configured
- Promotional pricing
- Coupons/promos

Examples:
- Flexible Rate
- Advance Purchase
- Weekend/seasonal rate
- Promotional rate

**Acceptance**
- Correct applicable price is returned for the selected dates/rate.
- Pricing is calculated/validated server-side.
- Client-submitted prices are never trusted.

---

# 4. Booking Flow

Expected flow:

```text
Search
  ↓
Availability Results
  ↓
Select Accommodation
  ↓
Select Rate Plan
  ↓
Guest Details
  ↓
Login / Register
  ↓
Booking Summary
  ↓
Temporary Hold
  ↓
Stripe Payment
  ↓
Verified Stripe Webhook
  ↓
Booking Confirmation
  ↓
Confirmation Email
```

**Acceptance**
- A valid user can complete the complete booking flow.
- Double booking is prevented.
- Frontend payment callback alone cannot confirm a booking.
- Verified Stripe webhook/payment state drives final payment confirmation.
- Failed/abandoned payment releases the temporary hold according to the configured policy.

---

# 5. Booking & Payment Status

### Booking states

```text
DRAFT
HELD
PAYMENT_PENDING
CONFIRMED
CHECKED_IN
CHECKED_OUT
CANCELLED
EXPIRED
```

### Payment states

```text
PENDING
PROCESSING
PAID
FAILED
REFUNDED
PARTIALLY_REFUNDED
```

Booking status and payment status must remain separate.

**Acceptance**
- Invalid state transitions are rejected.
- Status changes are recorded appropriately.
- Admin changes to important operational states are auditable.

---

# 6. Cancellation & Refund

Included:
- Customer cancellation where policy permits
- Admin cancellation
- Cancellation reason/status
- Stripe refund/status handling
- Refund record

**Acceptance**
- Cancellation rules are validated against configured policy.
- Cancelled bookings are no longer active inventory reservations.
- Refund state is tracked separately.
- Refund is not represented as successful until the provider confirms it.

---

# 7. Customer Account / My Bookings

Included:
- Profile
- Upcoming bookings
- Past bookings
- Booking details
- Booking/reference number
- Dates
- Accommodation
- Guest information
- Price/payment summary
- Booking status
- Cancellation where permitted

**Acceptance**
- A customer can access only their own bookings.
- Historical cancelled bookings can remain visible.
- Sensitive payment-card data is never exposed.

---

# 8. Stripe Scope

Included:
- Stripe integration
- Payment/checkout flow
- Backend payment verification
- Stripe webhook
- Webhook signature verification
- Payment-to-booking reconciliation
- Refund status handling

**Acceptance**
- Stripe secret keys stay server-side.
- Webhook signatures are verified.
- Duplicate webhook events do not create duplicate bookings/payments.
- Failed payment does not permanently lock inventory.
- Booking confirmation follows verified payment state where payment is required.

Stripe transaction/usage fees are separate from development fees.

---

# 9. Email Notification Scope

Minimum lifecycle events:

| Event | Customer | Admin |
|---|---:|---:|
| Booking received | Yes | Yes |
| Payment confirmed | Yes | Yes |
| Payment failed | Yes | Optional |
| Booking cancelled | Yes | Yes |
| Check-in reminder | Yes | Optional |
| Check-in completed | Yes | Optional |
| Check-out completed | Yes | Optional |
| Refund update | Yes | Yes |

**Acceptance**
- Correct recipient is selected.
- Relevant booking/reference information is included.
- Emails are triggered from backend events.
- Scheduled reminders use the configured timing.
- Email failure does not corrupt booking/payment state.

Email-provider charges are separate.

---

# 10. Management / Admin Panel

## Dashboard
Included:
- Total bookings
- Upcoming bookings
- Check-ins
- Check-outs
- Booking status overview
- Payment/revenue overview
- Basic occupancy/availability information

**Acceptance**
- Dashboard values come from backend data.
- Property timezone is respected for date/time calculations.

## Admin Authentication
Included:
- Login
- Logout
- Password management
- Protected routes
- Role-based permissions where configured

**Acceptance**
- Unauthenticated users cannot access protected admin routes.
- Unauthorized roles cannot perform restricted operations.

---

# 11. Room Management

## Room Types
- Create
- View
- Edit
- Enable/disable
- Description
- Capacity
- Beds
- Amenities
- Images

## Physical Rooms
- Create
- View
- Edit
- Room number/name
- Room type assignment
- Active/inactive status
- Blocking status

**Acceptance**
- Each physical room has a unique identity.
- Disabled rooms cannot be booked.
- Deleting/deactivating a room must not destroy historical booking records.

---

# 12. Availability Management

Included:
- Calendar view
- Room availability
- Manual block/unblock
- Date-specific availability
- Booking-driven inventory

**Acceptance**
- Confirmed bookings consume inventory.
- Temporary holds reserve inventory temporarily.
- Expired holds release inventory.
- Manual blocks prevent booking.
- Overlapping reservations for the same physical room cannot be created.

---

# 13. Reservation Management

Admin can:
- View all bookings
- Search
- Filter
- Sort
- Open booking details
- View guest details
- View payment information
- Change operational status
- Mark check-in
- Mark check-out
- Cancel booking
- View cancellation/refund information

**Acceptance**
- Admin can locate bookings using reference/customer/date information.
- Check-in/check-out changes persist.
- Required customer notifications are sent.

---

# 14. Customer Management

Included:
- Customer list
- Customer details
- Booking history
- Account status
- Search/filter

**Acceptance**
- Admin sees only necessary customer information.
- Raw payment-card information is never stored/displayed.

---

# 15. Payment Management

Included:
- Transaction list
- Payment status
- Booking reference
- Stripe payment reference
- Refund status
- Basic filtering/search

**Acceptance**
- Transactions are correctly linked to bookings.
- Payment state is based on trusted backend/provider events.
- Raw card information is never stored.

---

# 16. Coupon / Offer Management

Included:
- Create/edit
- Enable/disable
- Code
- Discount type/value
- Validity
- Usage limits where required
- Basic applicability rules

**Acceptance**
- Expired/invalid coupons are rejected.
- Discount calculation is server-side.
- Discounts cannot unintentionally create invalid totals.

---

# 17. CMS Scope

## Content Types
- General pages
- Homepage-managed content
- Property/about content
- Room content
- Gallery
- Offers
- Blogs/articles
- FAQs
- Policies
- Contact/property information
- Site settings

## Publishing

```text
DRAFT
PUBLISHED
ARCHIVED
```

**Acceptance**
- Draft content is not served as public published content.
- Published content is available through public CMS APIs.
- Archived content is excluded from normal public listings.

## Media
- Media upload/reference
- Image metadata
- Alt text
- Content association

Actual storage/bandwidth charges are separate.

## CMS SEO
Applicable content can manage:
- SEO title
- Meta description
- Slug
- Canonical URL
- OG title
- OG description
- OG image
- Indexing preference
- Image alt text

**Acceptance**
- SEO metadata is stored correctly.
- Public APIs return the required metadata.

## Blog / Articles
- Create
- Edit
- Draft
- Publish
- Archive
- Slug
- Featured image
- Category/tag where required
- SEO metadata

**Acceptance**
- Published posts are publicly retrievable.
- Slugs are unique.
- Draft posts are not exposed as published content.

## Gallery
- Media reference/upload
- Title/alt text
- Ordering
- Publish/unpublish
- Content association

## FAQ
- Create/edit/archive
- Question/answer
- Ordering
- Publish/unpublish

## Site Settings
- Property/company name
- Logo reference
- Contact email
- Phone
- Address
- Social links
- Footer/basic business information

The public website frontend remains outside this scope.

---

# 18. Backend/API Scope

The shared backend serves:
- Reservation app
- Admin app
- CMS
- Public landing website integration

Backend responsibilities:
- Authentication
- Authorization
- Users
- Room types
- Rooms
- Rates
- Availability
- Reservations
- Payments
- Refund status
- Coupons
- CMS
- Media metadata
- Email events
- Admin operations
- Audit logging for important actions

**Acceptance**
- Business-critical rules are enforced server-side.
- Protected endpoints require appropriate authorization.
- Inputs are validated.
- API errors use predictable structures.

---

# 19. Security Scope

Included:
- Secure authentication
- Password hashing
- Admin authorization/RBAC
- Input validation
- Rate limiting where appropriate
- Secure CORS
- Secure cookie/token handling
- Stripe webhook verification
- Secret management
- Basic audit logging
- No raw card storage

**Acceptance**
- Secrets are not committed to source control.
- Unauthorized admin operations are rejected.
- Invalid Stripe webhook signatures are rejected.
- Sensitive customer/payment data is not unnecessarily exposed.

---

# 20. Responsive Scope

Reservation and admin interfaces support:
- Desktop
- Tablet
- Mobile

**Acceptance**
- Core workflows remain usable on supported sizes.
- Tables have usable responsive behavior.
- Critical booking actions remain accessible on mobile.

---

# 21. Public Website Integration Boundary

Client/company develops the public landing website.

Included from our side:
- CMS
- Public CMS APIs
- Reservation/booking APIs
- Booking CTA destination
- Content structures
- SEO metadata APIs where applicable

Not included:
- Full public website frontend
- Website design
- Website animations
- Copywriting
- Public website-specific frontend implementation
- Public website deployment

---

# 22. Explicitly Out of Scope

Unless separately approved:

### Property
- Multiple independent hotels/properties
- Multi-property marketplace
- Property-owner/vendor accounts
- Commission management
- Multi-owner settlements

### Distribution
- Booking.com
- Airbnb
- Expedia
- Channel managers
- OTA synchronization
- External PMS synchronization

### Advanced pricing
- AI pricing
- Revenue management
- Demand forecasting
- Competitor price scraping
- Complex dynamic pricing engine

### Operations
- POS
- Restaurant management
- Housekeeping management
- Maintenance management
- Accounting/ERP
- Payroll/staff attendance

### Customer
- Loyalty/membership
- Referral system
- Gift cards unless separately specified
- Native iOS/Android applications

### Communication
- Complex WhatsApp automation
- SMS campaign platform
- Bulk marketing automation

### Analytics
- Advanced BI
- Data warehouse
- Predictive analytics
- Custom BI platform

### Internationalization
- Multi-currency expansion
- Multi-language CMS unless separately agreed
- Country-specific tax engines

### Website
- Complete public marketing website
- Major website redesign
- Full drag-and-drop page builder unless explicitly approved

---

# 23. Third-Party Services

Possible services:
- Stripe
- Email provider
- Cloud storage/media provider
- Hosting
- Database hosting
- Redis/infrastructure
- Domain/DNS
- SMS/WhatsApp provider
- Paid APIs/licenses

Where practical, production accounts should be owned by the client/company.

Development covers agreed integration/configuration, not third-party usage fees.

---

# 24. Client Inputs Required

### Business
- Property/company name
- Address
- Contact details
- Check-in/check-out rules
- Cancellation/refund policy
- Other booking policies

### Rooms
- Room/accommodation information
- Room numbers
- Capacity
- Beds
- Amenities
- Pricing
- Rate plans
- Images
- Availability rules

### Branding
- Logo
- Brand assets
- Brand colors if applicable

### Content
- Property/about content
- FAQs
- Policies
- Offers
- Blog/article content

### Payment
- Stripe account/access
- Business verification/KYC information

### Email
- Production email/provider
- Sender identity/domain configuration

Client delays in required content, credentials, approvals or third-party setup may affect the delivery timeline.

---

# 25. Definition of Done

A feature is complete when:

1. Agreed UI exists.
2. Required backend/API exists.
3. Required database changes exist.
4. Validation exists.
5. Authentication/authorization is applied where required.
6. Main success flow works.
7. Relevant failure/edge cases are handled.
8. Data persists correctly.
9. Responsive behavior is implemented.
10. No known critical/blocking defect remains.
11. Feature acceptance criteria pass.

---

# 26. Bug vs Change Request

## Bug

An implementation defect where an agreed feature fails to meet approved requirements.

Examples:
- Valid login fails.
- Valid booking fails.
- Confirmed room still appears bookable.
- Stripe webhook is not processed correctly.
- Published CMS content is missing from its public API.

## Change Request

A new or materially changed requirement after scope approval.

Examples:
- Add WhatsApp automation.
- Add a new payment provider.
- Add multi-property support.
- Add loyalty points.
- Add a new booking workflow.
- Replace an agreed workflow with a substantially different one.
- Add a new management module.

Change requests require separate estimation/approval.

---

# 27. Scope Change Process

```text
Client Request
      ↓
Requirement Review
      ↓
Impact Assessment
      ↓
Cost / Timeline Estimate
      ↓
Approval
      ↓
Scope Update
      ↓
Development
      ↓
Acceptance
```

Major out-of-scope functionality must not be treated as included because it was mentioned informally in chat.

Approved documentation and written change approvals form the development baseline.

---

# 28. Critical Acceptance Checklist

## Booking
- [ ] Valid dates can be searched.
- [ ] Invalid dates are rejected.
- [ ] Available inventory is shown.
- [ ] Unavailable inventory cannot be booked.
- [ ] Room can be selected.
- [ ] Rate plan can be selected.
- [ ] Guest details can be submitted.
- [ ] Temporary hold works where configured.
- [ ] Stripe payment can be initiated.
- [ ] Verified webhook confirms payment.
- [ ] Booking is created exactly once.
- [ ] Confirmation email is sent.
- [ ] Failed payment releases inventory.
- [ ] Duplicate webhook does not duplicate booking.
- [ ] Double booking is prevented.

## Cancellation
- [ ] Valid cancellation works.
- [ ] Policy restrictions work.
- [ ] Booking status changes correctly.
- [ ] Refund status is recorded.
- [ ] Cancellation email is sent.

## Check-in/out
- [ ] Admin can locate booking.
- [ ] Admin can mark check-in.
- [ ] Check-in notification works where configured.
- [ ] Admin can mark check-out.
- [ ] Check-out notification works where configured.

## Admin
- [ ] Admin authentication works.
- [ ] Unauthorized access is blocked.
- [ ] Room management works.
- [ ] Availability management works.
- [ ] Reservation management works.
- [ ] Customer management works.
- [ ] Payment records are visible.
- [ ] CMS management works.

## CMS
- [ ] Draft can be saved.
- [ ] Published content is publicly retrievable.
- [ ] Archived content is excluded.
- [ ] Room content can be managed.
- [ ] Gallery can be managed.
- [ ] Offers can be managed.
- [ ] Blog/article can be published.
- [ ] FAQs can be managed.
- [ ] SEO fields can be saved/retrieved.

---

# 29. Release Readiness

Before production:

- [ ] Production environment configured.
- [ ] Production database configured.
- [ ] Production Stripe account connected.
- [ ] Stripe webhook configured.
- [ ] Email provider configured.
- [ ] Media storage configured.
- [ ] CORS configured.
- [ ] Environment variables secured.
- [ ] Database indexes verified.
- [ ] Critical booking tests passed.
- [ ] Payment tests passed.
- [ ] Email tests passed.
- [ ] Admin authorization tested.
- [ ] Production smoke test completed.

---

# 30. Final Scope Statement

> **The development scope includes a complete single-property reservation and management platform consisting of the customer reservation/booking application, management/admin panel, CMS, shared backend/API, room and availability management, booking lifecycle management, Stripe payment integration, customer authentication, cancellation/refund handling, check-in/check-out operations, and transactional email notifications.**

The public marketing/landing website is developed separately by the client/company. The backend CMS and APIs required to manage and supply its agreed content are included.

Anything not explicitly included in the PRD or this scope document is not automatically included and may require a separate estimate.

---

# 31. Document Governance

Before implementing a major module, verify:

1. The requirement exists in the PRD.
2. The feature is included in this scope.
3. Acceptance criteria are defined.
4. Dependencies are understood.
5. Ambiguities are resolved.

If requirements change, update the documentation before or alongside implementation.

**End of Scope & Acceptance Specification**
