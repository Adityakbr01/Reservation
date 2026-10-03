# 08_CMS_AND_CONTENT_SPEC.md

# CMS & Content Management Specification

**Project:** Single-Property Hotel Reservation Platform  
**Document:** 08 — CMS & Content Management  
**Status:** Development Specification  
**Audience:** Backend developers, admin frontend developers, public-website developers, QA, AI coding agents  
**Depends on:** 01 Project Requirements PRD, 02 Scope & Acceptance, 03 User Flows, 04 System Architecture, 05 Database & API Specification, 06 Reservation Payment & Email Business Logic, 07 Admin Management Specification

---

# 1. Purpose

This document defines the CMS and content-management layer of the hotel platform.

The CMS allows authorized internal users to manage content that is consumed by the separately built public website and, where applicable, reservation experience.

The CMS must support:

- general pages
- property information
- room content
- gallery/media
- offers
- blogs/articles
- FAQs
- policies
- contact information
- site settings
- SEO metadata
- publishing workflow
- draft/preview/publish/archive
- media management
- public read-only content APIs
- content validation
- audit history
- cache invalidation

The CMS is a **single-property hospitality CMS**.

It is not a general-purpose website builder and is not a multi-hotel content platform.

---

# 2. CMS Boundary

The client/company builds the public landing/marketing frontend.

This project provides the backend CMS and management functionality required for that frontend to consume published content.

Architecture:

```text
Management App
      ↓
Protected CMS Admin API
      ↓
CMS Services
      ↓
MongoDB
      ↓
Published Content API
      ↓
Client-Built Public Website
```

Media:

```text
Admin
  ↓
Media API
  ↓
Cloudinary / S3 / equivalent
  ↓
Media URL
  ↓
MongoDB metadata
```

The public website must not have write access to CMS data.

---

# 3. CMS Principles

1. Draft content is private.
2. Only published content is public.
3. Archived content is not publicly returned unless explicitly requested by authorized admin APIs.
4. CMS content must not contain executable arbitrary JavaScript.
5. Public APIs return only fields intended for public consumption.
6. Internal IDs should not be unnecessarily exposed.
7. Published content must be cacheable.
8. Publishing should invalidate relevant caches.
9. Content changes must be auditable.
10. Historical reservation data must not depend on mutable CMS content.
11. Room marketing content and actual inventory are related but distinct concepts.
12. CMS cannot override reservation/business rules.
13. Marketing offers must not automatically create discounts unless linked to a valid pricing/coupon configuration.
14. SEO fields must be validated.
15. Slugs must be unique within their content namespace.
16. Media must be stored outside MongoDB where appropriate.
17. The CMS should remain intentionally simple and maintainable.

---

# 4. CMS Content Types

Recommended content types:

```text
PAGE
BLOG
FAQ
OFFER
ROOM_CONTENT
PROPERTY_CONTENT
POLICY
```

Supporting data:

```text
MEDIA
SITE_SETTINGS
SEO_METADATA
```

---

# 5. Content Lifecycle

All publishable content should use:

```text
DRAFT
   ↓
PUBLISHED
   ↓
ARCHIVED
```

Possible transitions:

```text
DRAFT → PUBLISHED
DRAFT → ARCHIVED
PUBLISHED → DRAFT
PUBLISHED → ARCHIVED
ARCHIVED → DRAFT
```

Exact transitions should be permission-controlled.

---

# 6. Draft

A draft:

- is editable
- is not public
- may be previewed by authorized users
- does not affect the public website
- does not affect reservation pricing unless explicitly connected to a pricing object
- should be auditable

Example:

```text
Page: About the Property
Status: DRAFT
```

Public API:

```text
404 / not returned
```

---

# 7. Published

Published content:

- is publicly consumable
- has a published timestamp
- must pass required validation
- may be cached
- should be indexed by public website where appropriate

Example:

```text
Page: About the Property
Status: PUBLISHED
```

---

# 8. Archived

Archived content:

- remains in the database
- is not returned by normal public APIs
- remains available to authorized admins
- preserves historical information
- can be restored to draft if required

Archive should generally be preferred over hard deletion for meaningful content.

---

# 9. Publishing Permissions

Recommended:

```text
Editor:
  create/edit draft
  preview
  submit/publish if granted

Admin:
  create/edit
  publish
  archive

Super Admin:
  full CMS access
```

The exact permission matrix must align with document 07.

---

# 10. General Page Model

A general page may contain:

```json
{
  "title": "About Us",
  "slug": "about-us",
  "excerpt": "...",
  "status": "PUBLISHED",
  "sections": [],
  "seo": {},
  "publishedAt": "..."
}
```

Recommended fields:

```text
title
slug
excerpt
sections
featuredImage
seo
status
publishedAt
createdAt
updatedAt
createdBy
updatedBy
```

---

# 11. Page Slug Rules

Slug must:

- be lowercase
- contain URL-safe characters
- use hyphens
- be unique
- avoid spaces
- avoid reserved API paths

Example:

```text
/about-us
/rooms
/offers
/contact
/privacy-policy
```

Avoid:

```text
/About Us
/about_us
/about us
```

---

# 12. Reserved Slugs

The system should maintain a reserved list.

Examples:

```text
admin
api
login
logout
auth
checkout
booking
bookings
payment
payments
webhooks
assets
media
```

CMS must reject reserved slugs.

---

# 13. Page Content Model

The recommended initial approach is a structured section model.

Example:

```json
{
  "sections": [
    {
      "type": "HERO",
      "data": {}
    },
    {
      "type": "EDITORIAL_TEXT",
      "data": {}
    },
    {
      "type": "ROOM_SHOWCASE",
      "data": {}
    },
    {
      "type": "CTA",
      "data": {}
    }
  ]
}
```

This gives the public website structured data without creating an unrestricted page builder.

---

# 14. Supported Section Types

Initial recommended sections:

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

Only implement sections actually required by the public website.

---

# 15. HERO Section

Fields:

```text
eyebrow
heading
subheading
backgroundImage
mobileImage
primaryCTA
secondaryCTA
alignment
```

Example:

```json
{
  "type": "HERO",
  "data": {
    "heading": "Stay Somewhere Special",
    "subheading": "A distinctive stay in ...",
    "backgroundImageId": "media_id",
    "primaryCTA": {
      "label": "Book Your Stay",
      "href": "/search-rates"
    }
  }
}
```

CTA links must be validated.

---

# 16. CTA Rules

A CTA can point to:

```text
internal page
reservation route
external URL
```

Example:

```text
Book Now
→ /search-rates
```

Do not allow arbitrary executable protocols such as:

```text
javascript:
data:
```

Only safe URL schemes should be accepted.

---

# 17. Editorial Text

Fields:

```text
heading
body
image
alignment
```

Rich text should be sanitized.

Allowed formatting should be deliberately limited.

Do not allow arbitrary:

```html
<script>
<iframe>
event handlers
```

unless a separately approved trusted embed system exists.

---

# 18. Split Content

Recommended:

```text
heading
body
image
imagePosition
CTA
```

Example:

```text
Image | Text
Text  | Image
```

The frontend decides presentation based on structured data.

---

# 19. Image Gallery Section

Fields:

```text
heading
description
images[]
layout
```

Each image references media.

Example:

```json
{
  "type": "IMAGE_GALLERY",
  "data": {
    "images": [
      "media_1",
      "media_2",
      "media_3"
    ]
  }
}
```

The public API may resolve media references into safe public media objects.

---

# 20. Room Showcase Section

Room showcase should reference actual room types.

Example:

```json
{
  "type": "ROOM_SHOWCASE",
  "data": {
    "roomTypeIds": [
      "room_type_1",
      "room_type_2"
    ]
  }
}
```

This avoids duplicating room content.

The public API should return:

```text
room type
marketing content
images
amenities
occupancy
booking CTA
```

---

# 21. Room Content vs Room Inventory

Important distinction:

```text
Room Type / Physical Room
```

controls actual inventory.

```text
Room Content
```

controls marketing presentation.

CMS must not change:

- physical room availability
- booking status
- allocation
- payment
- reservation state

unless the action explicitly uses the reservation/inventory domain.

---

# 22. Room Content Model

Recommended fields:

```text
roomTypeId
headline
description
shortDescription
amenities
bedDescription
featuredImage
gallery
displayOrder
status
seo
```

The room type remains the canonical operational entity.

---

# 23. Room Type Marketing Content

Example:

```text
Room Type:
Deluxe Room

Marketing:
"Relax in our spacious Deluxe Room..."
```

Operational:

```text
maxAdults: 2
maxChildren: 1
inventory: 4 rooms
```

The public API may combine these safely.

---

# 24. Feature Grid

Fields:

```text
heading
items[]
```

Each item:

```text
icon
title
description
```

If icons are represented by names, use an allowlisted icon set.

Do not allow arbitrary component names from CMS data.

---

# 25. Offer Card

Fields:

```text
title
description
image
validityText
CTA
couponCode/reference
```

If an offer is tied to a coupon:

```text
couponId
```

should reference the actual coupon.

Do not trust a CMS-only discount amount for checkout.

---

# 26. FAQ Section

A page may reference FAQs.

Example:

```json
{
  "type": "FAQ",
  "data": {
    "faqIds": ["faq_1", "faq_2"]
  }
}
```

Public API should return only published FAQs.

---

# 27. Testimonials

If testimonials are included:

```text
name
quote
rating
image
source
status
```

Any testimonial authenticity requirements remain the responsibility of the property.

Do not fabricate testimonials.

---

# 28. Location Section

Fields:

```text
heading
description
address
mapLink
coordinates where required
nearbyPlaces[]
```

Sensitive internal location information should not be exposed.

Public property address is intentionally public content.

---

# 29. Contact Section

Fields:

```text
phone
email
address
openingHours
contactCTA
```

Contact information should preferably be sourced from site settings to avoid duplication.

---

# 30. Property Content

Property content may include:

```text
property description
history
story
facilities
amenities
location
experience
policies
```

This content is informational.

It must not be used to calculate booking price.

---

# 31. Policies

Recommended policy content:

```text
Cancellation Policy
Check-in Policy
Check-out Policy
Children Policy
Pet Policy
Smoking Policy
Payment Policy
Privacy Policy
Terms & Conditions
```

Policy pages should be versionable/auditable.

---

# 32. Policy vs Booking Rules

Important:

A CMS policy page is explanatory content.

The actual booking system must enforce structured rules.

Example:

CMS says:

```text
Free cancellation until 48 hours before arrival.
```

The reservation backend must separately contain:

```text
cancellationWindowHours = 48
```

The CMS text alone must never control refunds.

---

# 33. Blog Management

Blog fields:

```text
title
slug
excerpt
content
featuredImage
author
category
tags
status
publishedAt
seo
```

Optional:

```text
readingTime
relatedPosts
```

---

# 34. Blog Content

Blog content can use sanitized rich text or structured sections.

Recommended supported formatting:

```text
paragraph
heading
bold
italic
link
unordered list
ordered list
image
quote
```

Do not support arbitrary HTML unless explicitly required.

---

# 35. Blog SEO

Each blog can have:

```text
seoTitle
metaDescription
canonicalUrl
ogTitle
ogDescription
ogImage
robots
```

Defaults can be generated from:

```text
title
excerpt
featuredImage
```

but admins should be able to override.

---

# 36. FAQ Management

FAQ record:

```json
{
  "question": "What time is check-in?",
  "answer": "Check-in starts at ...",
  "category": "Stay",
  "sortOrder": 10,
  "status": "PUBLISHED"
}
```

Only published FAQs should appear publicly.

---

# 37. Offer Management

Offers are marketing entities.

Fields:

```text
title
slug
description
image
validFrom
validUntil
CTA
couponId
status
seo
```

If no coupon/rate reference exists:

```text
offer = marketing only
```

The reservation engine must not apply a discount merely because an offer exists.

---

# 38. Site Settings

Global settings should include:

```text
propertyName
logo
favicon
defaultPhone
supportEmail
address
timezone
currency
checkInTime
checkOutTime
socialLinks
defaultSEO
```

These settings should be accessible through a public safe endpoint where required.

---

# 39. Public Site Settings

Public API must expose only safe settings.

Safe:

```text
property name
logo URL
phone
public email
address
social links
timezone
```

Never expose:

```text
database credentials
Stripe secrets
email provider API keys
JWT secrets
internal configuration
admin information
```

---

# 40. Media Architecture

Recommended:

```text
Admin
 ↓
Upload API
 ↓
Cloudinary/S3
 ↓
Media Metadata
 ↓
MongoDB
```

MongoDB stores metadata, not large binary files.

---

# 41. Media Upload

Upload workflow:

```text
Select file
   ↓
Validate MIME/type
   ↓
Validate size
   ↓
Upload storage
   ↓
Generate URL/key
   ↓
Create media record
   ↓
Return media object
```

---

# 42. Allowed Media Types

Typical:

```text
image/jpeg
image/png
image/webp
image/avif
```

Additional formats require explicit approval.

Do not accept executable files as media.

---

# 43. Image Optimization

Where supported:

- resize
- compress
- WebP/AVIF delivery
- responsive variants
- thumbnails
- original preservation where required

The CMS should store:

```text
width
height
format
size
```

---

# 44. Alt Text

Every public image should have meaningful alt text where the image conveys information.

Examples:

```text
"Deluxe room with garden view"
```

Decorative images can use empty alt text where appropriate.

Alt text should be editable in CMS.

---

# 45. Media Reference Strategy

Content should preferably reference:

```text
mediaId
```

rather than hardcoding storage URLs everywhere.

Public API can resolve:

```text
mediaId
→ public URL
→ alt text
→ dimensions
```

This makes media replacement easier.

---

# 46. Media Replacement

If replacing an image:

```text
keep content reference stable where possible
```

or update references atomically.

Avoid leaving published content with broken media.

---

# 47. Media Deletion

Before deletion:

```text
find references
```

If referenced by published content:

```text
block or require replacement
```

This prevents broken pages.

---

# 48. SEO Architecture

Every indexable content item may have:

```text
title
description
canonical
robots
og
```

Recommended model:

```json
{
  "title": "...",
  "description": "...",
  "canonical": "...",
  "robots": "index,follow",
  "ogTitle": "...",
  "ogDescription": "...",
  "ogImageId": "media_id"
}
```

---

# 49. SEO Defaults

If explicit SEO values are missing:

```text
SEO title ← content title
Description ← excerpt/summary
OG title ← SEO title
OG description ← SEO description
OG image ← featured image
```

Defaults should be generated by the public site/API layer without overwriting admin-authored values.

---

# 50. Robots Options

Recommended controlled options:

```text
index,follow
noindex,follow
index,nofollow
noindex,nofollow
```

Avoid allowing arbitrary robots strings unless required.

---

# 51. Canonical URL

Canonical should be:

- valid
- absolute where required by public website
- normalized
- consistent with site domain

Admins should not accidentally set canonical to an internal/admin URL.

---

# 52. Structured Data

The public website may generate structured data from CMS/API data.

Potential schemas:

```text
Hotel
LodgingBusiness
Article
FAQPage
BreadcrumbList
```

The CMS should provide factual fields.

The public frontend should generate schema markup in its own rendering layer.

Do not allow arbitrary JSON-LD script injection from CMS.

---

# 53. Sitemap Support

The CMS/public API should make it possible for the public website to build a sitemap from:

```text
published pages
published blogs
published offers where indexable
published room content
```

Do not include:

```text
draft
archived
admin
checkout
private account
booking detail
```

unless intentionally indexable.

---

# 54. Robots.txt

The public website should prevent crawling of private areas such as:

```text
/admin
/account
/login
/checkout
/payment
```

The CMS may expose configuration for public SEO behavior, but infrastructure/security rules remain outside CMS content.

---

# 55. Content Preview

Preview allows authorized users to see draft content before publication.

Possible flow:

```text
Admin edits draft
      ↓
Preview
      ↓
Preview token
      ↓
Public website preview mode
      ↓
Draft content rendered
```

Preview tokens must be:

- random
- short-lived
- revocable
- inaccessible to unauthorized users

---

# 56. Preview Security

Never expose:

```text
draft content through normal public API
```

with a simple query like:

```text
?status=draft
```

Preview must require authorization/token validation.

---

# 57. Public Content API

Recommended endpoints:

```http
GET /api/v1/public/pages/:slug
GET /api/v1/public/blogs
GET /api/v1/public/blogs/:slug
GET /api/v1/public/faqs
GET /api/v1/public/offers
GET /api/v1/public/room-types
GET /api/v1/public/site-settings
GET /api/v1/public/property
```

Exact routes must remain aligned with document 05.

---

# 58. Public Page Response

Example:

```json
{
  "data": {
    "title": "About Us",
    "slug": "about-us",
    "excerpt": "...",
    "sections": [],
    "seo": {
      "title": "...",
      "description": "...",
      "canonical": "..."
    },
    "publishedAt": "..."
  }
}
```

Do not expose:

```text
createdBy IDs
internal audit fields
draft revisions
admin notes
database internals
```

---

# 59. Public Blog API

List endpoint should return lightweight data:

```text
title
slug
excerpt
featuredImage
publishedAt
author display name
```

Detail endpoint returns full content.

Do not return full article bodies for every list item.

---

# 60. Public FAQ API

Return:

```text
question
answer
category
sortOrder
```

Only published records.

Sort by:

```text
category
sortOrder
```

or another documented ordering.

---

# 61. Public Offer API

Return:

```text
title
description
image
validity
CTA
public coupon/reference where intentionally exposed
```

Do not expose internal usage counters or sensitive coupon configuration.

---

# 62. Public Room API

Public room data can combine:

```text
Room Type
+
Room Marketing Content
+
Safe availability summary
```

But actual availability must use the reservation availability endpoint.

Do not expose internal room IDs unnecessarily.

---

# 63. CMS Caching

Published content is a strong caching candidate.

Possible cache keys:

```text
cms:page:{slug}
cms:blog:{slug}
cms:blogs:{page}:{filters}
cms:faqs
cms:offers
cms:rooms
cms:site-settings
```

Use Redis or HTTP/CDN caching where appropriate.

---

# 64. Cache Invalidation

When content is published/updated:

```text
invalidate affected cache
```

Examples:

```text
publish page /about-us
→ invalidate cms:page:about-us
```

```text
update site settings
→ invalidate cms:site-settings
```

Do not flush the entire cache for every small content update.

---

# 65. Content Versioning

For important content, maintain revision history where practical.

Possible revision fields:

```text
contentId
version
snapshot
createdBy
createdAt
changeSummary
```

At minimum, audit logs must record who changed/published content.

Full revision history can be implemented if required by scope.

---

# 66. Publishing Race Conditions

If two admins edit the same page:

```text
Admin A loads version 4
Admin B loads version 4

A saves → version 5
B saves old version 4
```

Recommended solution:

```text
optimistic concurrency
```

using:

```text
version
updatedAt
```

Backend rejects stale updates.

Example error:

```text
CONTENT_VERSION_CONFLICT
```

---

# 67. Content Validation

Before publish:

```text
required title
valid slug
valid sections
valid media references
valid CTA URLs
valid SEO fields
no invalid HTML
```

If validation fails:

```text
do not publish
```

Show field-level errors.

---

# 68. Rich Text Sanitization

If rich text is supported:

1. parse submitted content
2. sanitize allowed tags
3. remove scripts
4. remove event handlers
5. remove unsafe protocols
6. store sanitized result

Allowed set should be intentionally small.

---

# 69. Link Validation

Allowed:

```text
https://
http://
internal relative paths
mailto:
tel:
```

Depending on requirements.

Reject:

```text
javascript:
vbscript:
```

and other unsafe protocols.

---

# 70. CMS Search

Admin CMS search can support:

```text
title
slug
status
content type
published date
updated date
```

Server-side search is preferred.

---

# 71. CMS Filters

Recommended:

```text
content type
status
author/editor
published date
updated date
```

Quick filters:

```text
Drafts
Published
Archived
Recently Updated
```

---

# 72. CMS List Table

Columns:

```text
Title
Type
Status
Author
Updated
Published
Actions
```

Actions:

```text
Edit
Preview
Publish
Archive
Duplicate where supported
```

---

# 73. Content Duplication

If duplication is implemented:

```text
duplicate page
→ new draft
→ new unique slug
```

Never duplicate as published automatically.

Example:

```text
about-us
→ about-us-copy
status = DRAFT
```

---

# 74. Content Deletion

Prefer:

```text
ARCHIVE
```

over hard delete.

Hard deletion should be restricted to content where historical preservation is not required.

Before deletion:

```text
check references
```

---

# 75. Content Relationships

Example:

```text
Page
 ├── Media
 ├── Room Types
 ├── FAQs
 ├── Offers
 └── SEO
```

Blogs may reference:

```text
Media
Authors
Related Blogs
```

Do not create circular data dependencies unnecessarily.

---

# 76. CMS and Reservation Separation

CMS can advertise:

```text
"Stay 3 nights and enjoy..."
```

But the booking engine decides:

```text
whether that offer is actually valid
```

This separation is critical.

The CMS is not the pricing engine.

---

# 77. CMS and Rate Plans

A marketing page may reference:

```text
ratePlanId
```

if the public site needs to link to a specific offer.

However:

```text
ratePlanId
```

must be validated when booking.

If the rate is inactive:

```text
reservation API rejects selection
```

---

# 78. CMS and Coupons

A CMS offer may display:

```text
SAVE10
```

But checkout must independently validate:

```text
coupon exists
active
valid dates
usage limits
eligibility
```

Never apply a discount because the CMS says so.

---

# 79. Content Analytics

Basic analytics metadata may be supported:

```text
publishedAt
updatedAt
author
```

Advanced analytics are out of scope unless separately requested.

Do not build a full analytics platform into the CMS.

---

# 80. Public API Security

Public CMS endpoints may be unauthenticated, but must have:

- rate limiting
- safe response projection
- caching
- input validation
- pagination where applicable

Never return admin-only fields.

---

# 81. CMS API Authorization

Admin endpoints:

```text
authenticated + permission
```

Public endpoints:

```text
published content only
```

Preview:

```text
valid preview authorization
```

---

# 82. CMS API Error Codes

Recommended:

```text
CONTENT_NOT_FOUND
CONTENT_NOT_PUBLISHED
CONTENT_SLUG_EXISTS
CONTENT_VERSION_CONFLICT
INVALID_CONTENT_TYPE
INVALID_SECTION
INVALID_MEDIA_REFERENCE
INVALID_CTA_URL
INVALID_SEO_DATA
PUBLISH_VALIDATION_FAILED
MEDIA_NOT_FOUND
MEDIA_IN_USE
```

---

# 83. CMS Audit Events

Recommended:

```text
CONTENT_CREATED
CONTENT_UPDATED
CONTENT_PUBLISHED
CONTENT_UNPUBLISHED
CONTENT_ARCHIVED
CONTENT_RESTORED

MEDIA_UPLOADED
MEDIA_UPDATED
MEDIA_DELETED

SEO_UPDATED
SITE_SETTINGS_UPDATED
```

Include:

```text
actor
entity
timestamp
safe metadata
```

---

# 84. SEO/Public Rendering Responsibility

The CMS provides content and SEO metadata.

The public website is responsible for:

```text
HTML rendering
meta tags
Open Graph
Twitter/social metadata where applicable
structured data
canonical tags
sitemap generation
robots.txt
page performance
image rendering
```

Do not duplicate full public rendering logic inside the CMS backend.

---

# 85. CMS Performance

Target behavior:

```text
published content API
→ cache
→ small JSON payload
→ fast response
```

Use:

- projection
- pagination
- indexes
- caching
- CDN for media

Avoid:

```text
return every CMS record
```

on every request.

---

# 86. CMS Database Indexes

Recommended:

```text
cmsPages.slug
cmsPages.status
cmsPages.status + publishedAt
blogs.slug
blogs.status + publishedAt
faqs.status + sortOrder
offers.status + validFrom + validUntil
media.storageKey
roomContent.roomTypeId
```

Exact indexes must align with document 05.

---

# 87. Content Security

Never allow CMS content to become a path for:

- XSS
- stored HTML injection
- arbitrary script execution
- SSRF through unsafe media URLs
- malicious redirects
- unauthorized internal data exposure

External URLs should be validated.

---

# 88. Admin Preview UX

Recommended:

```text
Save Draft
Preview
Publish
Archive
```

Preview should open:

```text
new tab/window
```

or embedded preview.

Do not make Preview equivalent to Publish.

---

# 89. Unsaved Changes

If an editor modifies content and tries to leave:

```text
You have unsaved changes.
Leave without saving?
```

This is frontend UX only; backend remains authoritative.

---

# 90. Autosave

Autosave is optional.

If implemented:

- save drafts only
- never publish automatically
- debounce writes
- show save status
- handle version conflicts

Do not add autosave unless useful for the actual editor.

---

# 91. CMS Form Components

Reusable components:

```text
SlugInput
SEOFields
MediaPicker
RichTextEditor
SectionEditor
StatusBadge
PublishDialog
PreviewButton
ContentTable
ContentFilters
```

Use the same design system as the management app.

---

# 92. CMS Section Editor

If a section-based editor is used:

```text
Add Section
↓
Select Type
↓
Configure Fields
↓
Reorder
↓
Save Draft
↓
Preview
↓
Publish
```

Use stable section IDs if necessary for future editing/tracking.

---

# 93. Section Reordering

Store:

```text
sortOrder
```

or array order.

Backend should validate:

```text
supported section type
valid section schema
```

Do not trust arbitrary JSON from frontend.

---

# 94. CMS Schema Validation

Each section type should have its own schema.

Example:

```text
HERO schema
EDITORIAL_TEXT schema
CTA schema
GALLERY schema
```

Use shared TypeScript schemas where practical.

Backend validation is mandatory.

---

# 95. Public API Type Safety

Recommended shared types:

```text
PublicPage
PublicBlog
PublicFaq
PublicOffer
PublicRoom
PublicMedia
PublicSiteSettings
```

Do not expose internal database document types directly to frontend.

Use API DTOs.

---

# 96. CMS API Response DTOs

Example:

```ts
type PublicPageDTO = {
  title: string;
  slug: string;
  excerpt?: string;
  sections: PublicSectionDTO[];
  seo?: PublicSeoDTO;
  publishedAt: string;
};
```

This prevents accidental internal field leakage.

---

# 97. CMS Testing

## Unit tests

- slug generation
- slug uniqueness
- content validation
- section validation
- SEO validation
- URL validation
- publish rules
- permission checks

## Integration tests

- create page
- edit page
- publish page
- archive page
- public API
- preview
- media upload
- media reference protection
- cache invalidation

## Security tests

- XSS payload
- unsafe URL
- draft access
- unauthorized publish
- unauthorized settings change
- admin field leakage

---

# 98. CMS Acceptance Criteria

## Content

- [ ] create
- [ ] edit
- [ ] draft
- [ ] preview
- [ ] publish
- [ ] archive
- [ ] restore where supported

## Pages

- [ ] slug
- [ ] sections
- [ ] media
- [ ] SEO
- [ ] public API

## Blogs

- [ ] create
- [ ] edit
- [ ] publish
- [ ] SEO
- [ ] public list/detail

## FAQs

- [ ] create
- [ ] reorder
- [ ] publish
- [ ] public API

## Offers

- [ ] marketing content
- [ ] validity
- [ ] optional coupon reference
- [ ] public API

## Media

- [ ] upload
- [ ] metadata
- [ ] alt text
- [ ] reference protection
- [ ] safe deletion

## SEO

- [ ] metadata
- [ ] canonical
- [ ] robots
- [ ] OG
- [ ] public rendering support

## Security

- [ ] RBAC
- [ ] sanitized rich text
- [ ] safe URLs
- [ ] no draft leakage
- [ ] no secret leakage

---

# 99. Out-of-Scope CMS Features

Unless separately approved:

- full drag-and-drop page builder
- arbitrary HTML editor
- arbitrary JavaScript injection
- multi-site CMS
- multi-property CMS
- localization framework
- advanced workflow/approval chains
- enterprise DAM
- marketing automation
- newsletter campaign platform
- full analytics suite
- A/B testing
- AI content generation
- advanced SEO crawler
- automatic backlink management

---

# 100. Coding-Agent Instructions

Any AI coding agent working on CMS must:

1. Read documents `01` through `08`.
2. Treat document 08 as the CMS source of truth.
3. Inspect the existing public website integration before adding APIs.
4. Do not assume the public website is built by the same team.
5. Keep public CMS APIs read-only.
6. Never expose draft content publicly.
7. Never trust CMS content for reservation pricing.
8. Never let CMS content override cancellation/refund rules.
9. Sanitize rich text.
10. Validate all URLs.
11. Validate section schemas.
12. Keep media external to MongoDB.
13. Protect media referenced by published content.
14. Use optimistic concurrency where needed.
15. Invalidate caches after publication.
16. Keep internal database fields out of public DTOs.
17. Audit publishing and settings changes.
18. Do not build an unnecessary generic page-builder framework.
19. Do not add multi-hotel behavior.
20. Flag ambiguous content requirements instead of inventing them.

---

# 101. Recommended Implementation Order

### Phase 1 — CMS Foundation

```text
CMS models
Status lifecycle
Slug utilities
Validation
Permissions
Audit events
```

### Phase 2 — Pages

```text
Page CRUD
Sections
Draft
Preview
Publish
Archive
Public page API
```

### Phase 3 — Media

```text
Upload
Metadata
Media picker
Alt text
Reference checking
```

### Phase 4 — Room/Property Content

```text
Property content
Room content
Room showcase
Gallery
Amenities
```

### Phase 5 — Blog/FAQ/Offers

```text
Blogs
FAQs
Offers
Public APIs
```

### Phase 6 — SEO

```text
SEO fields
Canonical
OG
Robots
Public DTOs
```

### Phase 7 — Cache & Hardening

```text
Redis caching
Invalidation
Preview security
XSS testing
URL security
Concurrency
```

---

# 102. Final CMS Architecture

```text
                 ┌──────────────────────┐
                 │   Management App     │
                 │ CMS Editor           │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ Protected CMS API    │
                 └──────────┬───────────┘
                            │
                            ▼
                 ┌──────────────────────┐
                 │ CMS Services         │
                 │ Validation           │
                 │ Publishing           │
                 │ Permissions          │
                 │ Audit                │
                 └──────┬───────┬───────┘
                        │       │
                        ▼       ▼
                    MongoDB   Redis
                        │
                        ▼
              Published Content API
                        │
                        ▼
              Client-Built Website
                        │
                        ▼
              Public Visitors
```

Media:

```text
Management App
     ↓
Media API
     ↓
Cloudinary / S3
     ↓
Media URL + Metadata
     ↓
CMS Content
     ↓
Public Website
```

---

# 103. Final Definition of Done

The CMS is complete when:

```text
Authorized admin/editor
        ↓
Can create content
        ↓
Can save draft
        ↓
Can preview safely
        ↓
Can publish with validation
        ↓
Published content becomes available
through public APIs
        ↓
Public website consumes only published content
        ↓
Media is securely managed
        ↓
SEO metadata is available
        ↓
Caches are invalidated correctly
        ↓
All important CMS mutations are audited
        ↓
Reservation rules remain independent
from marketing content
```

The CMS should remain a focused content-management system for the single-property platform rather than becoming an unnecessarily complex generic website builder.

---

**End of Document**
