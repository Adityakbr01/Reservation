# Overall App Architecture

Tum 3 frontend apps banaoge, lekin **backend ek hi shared MERN backend** hoga.

```text
                    ┌──────────────────────┐
                    │      USER / PUBLIC   │
                    └──────────┬───────────┘
                               │
                 ┌─────────────┴─────────────┐
                 │                           │
        ┌────────▼────────┐        ┌────────▼────────┐
        │ LANDING WEBSITE │        │ RESERVATION APP │
        │                 │        │                 │
        │ Brand / Content │        │ Search          │
        │ Rooms           │        │ Availability    │
        │ Gallery         │        │ Room Selection  │
        │ Blog            │        │ Booking         │
        │ Offers          │        │ Payment         │
        │ About           │        │ Confirmation     │
        └────────┬────────┘        └────────┬────────┘
                 │                          │
                 └──────────┬───────────────┘
                            │
                     ┌──────▼──────┐
                     │ EXPRESS API │
                     │   Node.js   │
                     └──────┬──────┘
                            │
             ┌──────────────┼──────────────┐
             │              │              │
        ┌────▼────┐    ┌────▼─────┐   ┌───▼─────┐
        │ MongoDB │    │  Redis   │   │ Stripe  │
        └─────────┘    └──────────┘   └─────────┘
                            ▲
                            │
                   ┌────────┴────────┐
                   │ MANAGEMENT APP  │
                   │                 │
                   │ Admin Dashboard │
                   │ Property        │
                   │ Rooms           │
                   │ Bookings        │
                   │ Payments        │
                   │ CMS             │
                   │ Users           │
                   └─────────────────┘
```

---

# 1. Landing Website

Ye **premium hotel/property brand website** hoga.

Reference jaisa experience:

```text
HOME
 │
 ├── Hero
 │     └── Book Now / Search
 │
 ├── About Property
 │
 ├── Rooms
 │
 ├── Experiences
 │
 ├── Offers
 │
 ├── Gallery
 │
 ├── Events / Weddings (agar applicable)
 │
 ├── Blog / Articles
 │
 ├── Location
 │
 ├── Contact
 │
 └── Footer
```

Important:

**Ye hard-coded static website nahi hogi.**

Admin panel se:

* Hero image
* Banner
* Heading
* Description
* Room information
* Offers
* Blog
* Gallery
* Pages
* SEO

change ho sakega.

---

# 2. Reservation App

Ye actual **booking engine** hoga.

User:

```text
Check-in
     ↓
Check-out
     ↓
Adults / Children
     ↓
Rooms
     ↓
SEARCH
```

Backend available rooms calculate karega.

Example:

```text
Hotel ABC

Room 101  ❌ Booked
Room 102  ✅ Available
Room 103  ❌ Booked
Room 104  ✅ Available
```

User ko:

```text
Available Rooms

Deluxe Room
₹150/night

Premium Room
₹220/night

Suite
₹400/night
```

show hoga.

Then:

```text
Select Room
     ↓
Guest Details
     ↓
Price Summary
     ↓
Payment
     ↓
Booking Confirmed
```

---

# 3. Sabse important — Room availability

Property ek hogi:

```text
Hotel ABC
```

Uske andar:

```text
Room 101
Room 102
Room 103
Room 104
Room 105
```

User:

```text
10 Oct → 13 Oct
```

search karega.

Backend existing bookings check karega.

```text
10 Oct ───────── 13 Oct

Room 101
████████████      ❌

Room 102
                  ✅

Room 103
    ███████       ❌

Room 104
                  ✅
```

Sirf available rooms return honge.

---

# 4. Booking ke time double booking nahi honi chahiye

Suppose Room 102 ka sirf ek inventory hai.

Do users simultaneously booking kar rahe hain.

Isliye:

```text
User A
   ↓
Room 102
   ↓
Temporary HOLD
   ↓
Payment
```

Dusra user:

```text
User B
   ↓
Room 102
   ↓
UNAVAILABLE
```

Payment fail/timeout:

```text
HOLD EXPIRED
      ↓
Room AVAILABLE
```

Ye system ka **most important backend logic** hai.

---

# 5. Stripe Payment

Stripe **client ka account** hoga.

```text
Customer
   ↓
Your Reservation App
   ↓
Express Backend
   ↓
Client's Stripe Account
   ↓
Payment
```

Payment ke baad Stripe webhook:

```text
Stripe
  ↓
Webhook
  ↓
Express Backend
  ↓
Verify Payment
  ↓
Booking CONFIRMED
```

Frontend ke `"Payment Successful"` ko blindly trust nahi karna.

---

# 6. Management/Admin App

Ye business owner ka control panel hoga.

Dashboard:

```text
Today's Bookings       12
Today's Revenue      £2,450

Confirmed Bookings     85
Pending Bookings        4
Cancelled               3
```

---

## Property Management

```text
Property
 │
 ├── Basic Information
 ├── Address
 ├── Images
 ├── Amenities
 ├── Policies
 └── SEO
```

---

## Room Management

```text
Rooms
 │
 ├── Room 101
 ├── Room 102
 ├── Room 103
 ├── Room 104
 └── Room 105
```

Admin:

* Add room
* Edit room
* Price
* Capacity
* Images
* Amenities
* Block room
* Maintenance
* Availability

manage karega.

---

# 7. Booking Management

Admin ko saari bookings dikhegi:

```text
Booking #BK1001

Guest: John Smith
Room: 102

Check-in: 10 Oct
Check-out: 13 Oct

Amount: £450

Payment: PAID
Status: CONFIRMED
```

Admin:

* Booking view
* Cancel
* Refund
* Check-in
* Check-out
* Notes

manage kar sakta hai.

---

# 8. CMS — Website ka pura control

Ye tumhare project ka important part hai.

Admin panel:

```text
Website
 │
 ├── Homepage
 ├── Banners
 ├── Rooms
 ├── Gallery
 ├── Offers
 ├── Events
 ├── Blogs
 ├── Articles
 ├── Pages
 ├── FAQs
 └── SEO
```

Client ko future me developer ke paas jaakar:

> "Homepage ka banner change karo"

nahi bolna padega.

Admin khud karega.

---

# 9. Blog/Article

Admin:

```text
Create Article

Title
Slug
Description
Featured Image
Content
Category
Tags
SEO Title
SEO Description

Draft / Publish
```

Publish karte hi public website par:

```text
/blog/my-article
```

available.

---

# 10. Database

MongoDB me main entities roughly:

```text
users
properties
rooms
bookings
payments
coupons
reviews

pages
banners
blogs
articles
offers
events
media
categories
settings
notifications
auditLogs
```

Relationship:

```text
Property
   │
   └── Rooms
          │
          └── Bookings
                 │
                 ├── User
                 └── Payment
```

---

# 11. Backend

Tumhara main backend:

```text
Node.js
Express
MongoDB
Mongoose
Redis
Stripe
```

Modules:

```text
/auth
/properties
/rooms
/availability
/bookings
/payments
/users
/reviews
/coupons
/cms
/media
/notifications
/admin
```

Business logic services me:

```text
availability.service
booking.service
payment.service
pricing.service
notification.service
cms.service
```

rakho.

---

# 12. Frontend Technology

Tum jo bol rahe ho wo perfectly fit hai:

### Public + Reservation

```text
React
TypeScript
Tailwind CSS
shadcn/ui
GSAP
React Router
TanStack Query
```

### Admin

```text
React
TypeScript
Tailwind
shadcn/ui
TanStack Query
```

### Backend

```text
Node
Express
MongoDB
Mongoose
Redis
Stripe
```

---

# 13. Teen apps ka folder structure

Main aise rakhunga:

```text
project/
│
├── apps/
│   │
│   ├── website/
│   │    └── React App
│   │
│   ├── reservation/
│   │    └── React App
│   │
│   └── management/
│        └── React App
│
├── server/
│   └── Express API
│
└── shared/
     ├── types
     ├── constants
     └── utilities
```

Ya separate repositories bhi rakh sakte ho.

---

# 14. Actual user journey

Suppose user Google se website par aaya:

```text
Google
  ↓
Landing Website
  ↓
"Book Your Stay"
  ↓
Reservation App
  ↓
2 Oct → 5 Oct
2 Adults
1 Room
  ↓
Search
  ↓
Available Rooms
  ↓
Deluxe Room
  ↓
Select
  ↓
Guest Details
  ↓
£600
  ↓
Stripe
  ↓
Payment
  ↓
Webhook
  ↓
Booking Confirmed
  ↓
Email
```

Admin side simultaneously:

```text
New Booking
      ↓
Management Dashboard
      ↓
Reservation #BK1024
      ↓
Room 102 blocked
      ↓
Payment PAID
```

---

# 15. Overall architecture ka main principle

**Landing website = Sell the experience**

**Reservation app = Convert visitor into booking**

**Management app = Run the business**

**Backend = Business logic + source of truth**

```text
         BRAND
          │
          ▼
   Landing Website
          │
       Book Now
          │
          ▼
   Reservation App
          │
       Booking
          │
       Payment
          │
          ▼
      Backend
          │
    ┌─────┴─────┐
    ▼           ▼
 MongoDB      Stripe
    │
    ▼
Management App
```

