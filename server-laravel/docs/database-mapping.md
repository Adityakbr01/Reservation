# Database Mapping: MongoDB → MySQL

## Collection → Table Mapping

| MongoDB Collection | MySQL Table | Model | Notes |
|---|---|---|---|
| users | users | User | PK: char(24) |
| properties | properties | Property | Singleton property |
| room_types | room_types | RoomType | FK: property_id |
| rooms | rooms | Room | FK: property_id, room_type_id |
| rate_plans | rate_plans | RatePlan | FK: property_id, room_type_id |
| daily_prices | daily_prices | DailyPrice | FK: rate_plan_id, property_id |
| cancellation_policies | cancellation_policies | CancellationPolicy | FK: property_id |
| availability_blocks | availability_blocks | AvailabilityBlock | FK: property_id, room_id |
| coupons | coupons | Coupon | FK: property_id |
| bookings | bookings | Booking | FK: property_id, user_id |
| booking_items | booking_items | BookingItem | FK: booking_id, room_type_id, room_id |
| payments | payments | Payment | FK: booking_id, user_id |
| refunds | refunds | Refund | FK: booking_id, payment_id |
| webhook_events | webhook_events | WebhookEvent | Standalone |
| cms_pages | cms_pages | CmsPage | FK: created_by |
| cms_blog_posts | cms_blog_posts | CmsBlogPost | FK: created_by |
| cms_faqs | cms_faqs | CmsFaq | FK: created_by |
| cms_offers | cms_offers | CmsOffer | FK: created_by, coupon_id |
| cms_policy_docs | cms_policy_docs | CmsPolicyDoc | FK: created_by |
| media | media | Media | FK: created_by |
| email_templates | email_templates | EmailTemplate | FK: updated_by |
| enquiries | enquiries | Enquiry | FK: room_type_id |
| newsletter_subscribers | newsletter_subscribers | NewsletterSubscriber | Standalone |
| notifications | notifications | Notification | FK: booking_id, payment_id |
| reviews | reviews | Review | FK: room_type_id, user_id, booking_id |
| site_settings | site_settings | SiteSettings | Singleton |
| audit_logs | audit_logs | AuditLog | Standalone |

## Data Type Mapping

| MongoDB/BSON | MySQL | Notes |
|---|---|---|
| ObjectId (24-char hex) | CHAR(24) | Preserved as string IDs |
| String | VARCHAR(n) / TEXT | Lengths from Prisma schema |
| Int32 | INT | |
| Int64 | BIGINT | |
| Double | DECIMAL(p,s) | Money uses DECIMAL(12,2) |
| Boolean | TINYINT(1) | |
| Date | DATETIME(3) | UTC storage |
| Array | JSON | For embedded arrays |
| Embedded document | JSON | For document-like data |
| Binary | VARBINARY / BLOB | |

## Index Mapping

| Table | Index Columns | Type |
|---|---|---|
| users | email | UNIQUE |
| properties | slug | UNIQUE |
| room_types | (property_id, slug) | UNIQUE |
| rooms | (property_id, room_number) | UNIQUE |
| rate_plans | (property_id, slug) | UNIQUE |
| daily_prices | (rate_plan_id, date) | UNIQUE |
| coupons | (property_id, normalized_code) | UNIQUE |
| bookings | booking_number | UNIQUE |
| payments | provider_payment_intent_id | UNIQUE |
| refunds | provider_refund_id | UNIQUE |
| webhook_events | stripe_event_id | UNIQUE |
| cms_pages | slug | UNIQUE |
| cms_blog_posts | slug | UNIQUE |
| cms_offers | slug | UNIQUE |
| cms_policy_docs | key | UNIQUE |
| media | storage_key | UNIQUE |
| email_templates | key | UNIQUE |
| newsletter_subscribers | normalized_email | UNIQUE |
| notifications | idempotency_key | UNIQUE |

## Relationship Mapping

- Property → RoomType (1:M)
- Property → Room (1:M)
- Property → RatePlan (1:M)
- Property → DailyPrice (1:M)
- Property → CancellationPolicy (1:M)
- Property → AvailabilityBlock (1:M)
- Property → Coupon (1:M)
- Property → Booking (1:M)
- RoomType → Room (1:M)
- RoomType → RatePlan (1:M)
- RoomType → BookingItem (1:M)
- RoomType → Review (1:M)
- RoomType → Enquiry (1:M)
- Room → AvailabilityBlock (1:M)
- Room → BookingItem (1:M)
- RatePlan → CancellationPolicy (M:1, optional)
- RatePlan → DailyPrice (1:M)
- RatePlan → BookingItem (1:M)
- Coupon → CmsOffer (1:M)
- User → Booking (1:M)
- User → Payment (1:M)
- User → Refund (1:M)
- User → AvailabilityBlock (1:M)
- User → Coupon (1:M)
- User → Media (1:M)
- User → Review (1:M)
- User → CmsPage/BlogPost/Faq/Offer/PolicyDoc (1:M)
- Booking → BookingItem (1:M)
- Booking → Payment (1:M)
- Booking → Refund (1:M)
- Booking → Notification (1:M)
- Booking → Review (1:M)
- Payment → Refund (1:M)
- Payment → Notification (1:M)
- BookingItem → RoomType (M:1, optional)
- BookingItem → Room (M:1, optional)
- BookingItem → RatePlan (M:1, optional)

## ON DELETE Behavior

- Cascade: Property → all dependents, Booking → items/payments/refunds
- Set Null: User → dependents, RatePlan → CancellationPolicy
- Restrict: None explicitly defined
