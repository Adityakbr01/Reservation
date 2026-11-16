# Plan: Extra add-on counter & limiter (per cottage)

**Goal:** Let an admin configure, per cottage, optional add-ons (Golf, Padel, Dining, …) with a per-extra quantity counter: a `show counter` on/off toggle, a `min`, and a `max` (1, 2, …). When the counter is off the extra renders as a plain checkbox (current behaviour). On the client booking page and booking-journey dialog, show a `−` / qty / `+` stepper when the counter is on, clamp to `[min, max]`, and send quantities to the server with server-side validation.

**Decision (shared understanding):** an extra is "selected" when its qty > 0. Counter-off (checkbox) ⇒ qty = 1 when checked, 0 when unchecked. Counter-on ⇒ initial qty = `min` (default 1); qty clamped to `[min, max]`; `max = null` means no explicit cap. Booking payload changes from `extras: string[]` to `extras: [{ id, qty }]` (qty > 0 only).

## In scope
- Admin cottage edit form: add `showCounter`, `min`, `max` controls to each extra row (add/edit/reorder/delete already exist).
- Persist cottage `extras` server-side (currently dropped: RoomType has no `extras` column, Zod schema has no extras, repository does not save/map it).
- Client `CottageExtra` types gain `showCounter`, `min`, `max`.
- Client `BookingPage.tsx` and `BookingJourneyDialog.tsx`: render stepper when `showCounter` is on, checkbox when off; send `{ id, qty }`; validation min/max/off.
- Server: accept extras with qty in booking creation + quote, validate qty against cottage extra min/max, compute `extrasFee`, store in booking `pricing` JSON.

## Out of scope
- Public cottage-detail route `/public/cottages/:slug` is not registered on the server (pre-existing gap); extras flow to the booking flow via availability search (`/api/public/room-types`), which is wired.
- Styling beyond reusing existing `Card`/`Button`/`Input` primitives.
- Email/receipt rendering of extras beyond storing in `pricing.extras` / `pricing.extrasFee`.

## Data model

`server/prisma/schema.prisma` — `RoomType` model:
```prisma
extras Json? @db.Json
```
Then `prisma generate` + `prisma migrate dev --name add_extras_to_room_type`.

Shared `CottageExtra` (two copies — keep them in sync):
- `admin/src/modules/cottages/types/cottage.types.ts:32`
- `client/src/modules/availability/types/availability.types.ts:20`

Add:
```ts
showCounter?: boolean; // default true
min?: number;          // default 1 when counter on
max?: number | null;   // default null (no cap)
```

## API contracts

**Admin room-type** (`PATCH /api/v1/admin/room-types/:id`, also reached by admin client as `/api/v1/admin/cottages` — see wiring note below):
- body `extras?: Array<{ id, title, description?, price, pricingType, imageMediaId?, imageUrl?, showCounter?, min?, max? }>`

**Booking/quote** (`POST /api/v1/bookings/quote`, `POST /api/v1/bookings`, `POST /public/bookings/guest`):
- `extras?: Array<{ id: string; qty: number }>` (qty > 0)
- server validates each qty against the room type's extra `min`/`max` (422 on violation)
- response `pricing.extrasFee` (minor units) and `pricing.extras: [{ id, title, qty, lineAmount }]`

## Wiring note (verify)
Admin client `BASE = "/admin/cottages"` with `baseURL …/api/v1` ⇒ calls `/api/v1/admin/cottages`. Server registers `/api/v1/admin/room-types` only. Before implementation, confirm an alias/rewrite exists or add `adminRoomTypesRouter` under `/api/v1/admin/cottages` too, otherwise admin saves (and extras persistence) will 404.

## Ordered tasks

1. **Prisma + types:** add `extras Json?` to `RoomType` in `server/prisma/schema.prisma`; run `prisma generate` and create/apply migration.
2. **Shared types:** add `showCounter`/`min`/`max` to `CottageExtra` in admin `cottage.types.ts` and client `availability.types.ts`.
3. **Server schema:** add `extras` validation (array of extra objects incl. `showCounter`/`min`/`max`) to `createRoomTypeSchema`/`updateRoomTypeSchema` in `server/src/modules/roomTypes/room-type.schema.ts`.
4. **Server repository:** 
   - `room-type.repository.ts`: add `extras` to `CreateRoomTypeInput`, persist in `createRoomType`, map `doc.extras` in `toRoomType`, add `extras` to `UpdateRoomTypeInput`, persist in `updateRoomTypeById`.
5. **Server booking/quote:**
   - `quote.schema.ts`: add `extras?: Array<{ id, qty }>` to `QuoteRequest`.
   - `quote.service.ts`: `createQuote` computes `extrasFee` from cottage extras + qty; returns `pricing.extrasFee`.
   - `booking.schema.ts`: add `extras?: Array<{ id, qty }>` to `createBookingSchema` and `guestBookingSchema`.
   - `booking.service.ts` `createBooking`: validate each extra qty `[min, max]` (422 otherwise), compute `extrasFee`, store `pricing.extras` + `pricing.extrasFee`.
6. **Admin UI:** `admin/src/modules/cottages/components/CottageForm.tsx` — per-extra row: "Show counter" Switch (default on), Min input, Max input; initialize new/default extras with `showCounter: true, min: 1, max: null`; validate `min <= max` when both set.
7. **Client booking page:** `client/src/modules/booking/pages/BookingPage.tsx` — replace checkbox with stepper when `showCounter` is on (else checkbox), track `extraQtys`, clamp to `[min, max]`, send `extras: [{ id, qty }]` (qty > 0), surface server `extrasFee`.
8. **Client journey dialog:** `client/src/modules/booking/components/BookingJourneyDialog.tsx` — same stepper/checkbox logic in step 2 (Extras) and aside summary; send `{ id, qty }` in `createGuestBooking`.
9. **Client types/api:** `booking.types.ts` (`GuestBookingPayload.extras`, `QuoteRequest.extras`) and `booking.api.ts` (`QuoteRequest`, `CreateBookingInput`) change `extras?: string[]` → `extras?: Array<{ id, qty }>`.
10. **Verify:** run lint + typecheck + tests for server, admin, client.

## Validation rules
- Admin: `min >= 0`; `max >= 0` if set; if both set, `min <= max`; price >= 0.
- Client: stepper clamped to `[min, max]` at all times (client-side); server re-validates authoritatively (422) before hold/quote.
- Off: checkbox only, qty ∈ {0, 1}, min/max ignored.

## Verification commands
- Server: `npm run typecheck` (tsc --noEmit), `npm run lint` (oxlint), `npm test` (bun test)
- Admin: `npm run lint` (oxlint); `npm run build` runs `tsc -b` (typecheck)
- Client: `npm run lint` (oxlint); `npm run build` runs `tsc -b` (typecheck)

## Rollback
Revert the Prisma migration (`prisma migrate dev` rollback not supported natively — instead forward-fix), revert source changes; `extras` column is additive and nullable, so dropping it is safe if needed.

## Open questions (to confirm before/while implementing)
1. Initial qty when counter on and `min = 1`: auto-select extra at qty 1, or start at 0 and require `+`? Proposed: start at `min`.
2. `max = null` → any UI cap (e.g. 99) to prevent runaway input, or truly unbounded? Proposed: unbounded server-side, UI input capped at a large display number.
3. Confirm `/api/v1/admin/cottages` route wiring (see wiring note).
