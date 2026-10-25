import { prisma } from "../../config/database";
import { newId } from "../../utils/id";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { HOLD_STATUSES, INVENTORY_BLOCKING_STATUSES } from "./booking.types";
import type { Booking, BookingItem, BookingSource, BookingStatus, PaymentStatus } from "./booking.types";

const BOOKING_NUMBER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Human-readable unique reference (never the Mongo _id). Retried on collision. */
export function generateBookingNumber(): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += BOOKING_NUMBER_ALPHABET[Math.floor(Math.random() * BOOKING_NUMBER_ALPHABET.length)];
  }
  return `QB-${suffix}`;
}

export interface BookingDocLike extends Booking {
  _id: { toString(): string };
}

export function toBooking(doc: any): Booking {
  const guests = typeof doc.guests === "string" ? JSON.parse(doc.guests) : doc.guests;
  const contact = typeof doc.contact === "string" ? JSON.parse(doc.contact) : doc.contact;
  const pricing = typeof doc.pricing === "string" ? JSON.parse(doc.pricing) : doc.pricing;
  const cancellation = typeof doc.cancellation === "string" ? JSON.parse(doc.cancellation) : (doc.cancellation ?? {});
  const hold = typeof doc.hold === "string" ? JSON.parse(doc.hold) : (doc.hold ?? {});
  const stay = typeof doc.stay === "string" ? JSON.parse(doc.stay) : (doc.stay ?? {});

  return {
    id: doc.id ?? doc._id?.toString(),
    bookingNumber: doc.bookingNumber,
    propertyId: typeof doc.propertyId === "object" ? doc.propertyId.toString() : doc.propertyId,
    userId: doc.userId ? (typeof doc.userId === "object" ? doc.userId.toString() : doc.userId) : null,
    status: doc.status as BookingStatus,
    paymentStatus: doc.paymentStatus as PaymentStatus,
    checkIn: doc.checkIn,
    checkOut: doc.checkOut,
    guests: { adults: guests?.adults ?? 0, children: guests?.children ?? 0 },
    contact: {
      firstName: contact?.firstName ?? "",
      lastName: contact?.lastName ?? "",
      email: contact?.email ?? "",
      phone: contact?.phone ?? "",
      title: contact?.title ?? null,
      mobile: contact?.mobile ?? null,
      address1: contact?.address1 ?? null,
      address2: contact?.address2 ?? null,
      city: contact?.city ?? null,
      county: contact?.county ?? null,
      postcode: contact?.postcode ?? null,
      country: contact?.country ?? null,
    },
    pricing: {
      currency: pricing?.currency ?? "GBP",
      subtotal: pricing?.subtotal ?? 0,
      discount: pricing?.discount ?? 0,
      taxes: pricing?.taxes ?? 0,
      fees: pricing?.fees ?? 0,
      total: pricing?.total ?? 0,
      couponCode: pricing?.couponCode ?? null,
    },
    cancellation: {
      cancelledAt: cancellation?.cancelledAt ? new Date(cancellation.cancelledAt) : null,
      cancelledBy: cancellation?.cancelledBy ? cancellation.cancelledBy.toString() : null,
      reason: cancellation?.reason ?? null,
    },
    hold: {
      holdId: hold?.holdId ?? null,
      expiresAt: hold?.expiresAt ? new Date(hold.expiresAt) : null,
    },
    stay: {
      checkedInAt: stay?.checkedInAt ? new Date(stay.checkedInAt) : null,
      checkedInBy: stay?.checkedInBy ? stay.checkedInBy.toString() : null,
      checkedOutAt: stay?.checkedOutAt ? new Date(stay.checkedOutAt) : null,
      checkedOutBy: stay?.checkedOutBy ? stay.checkedOutBy.toString() : null,
    },
    source: doc.source as BookingSource,
    notes: doc.notes ?? null,
    reminderSent: Boolean(doc.reminderSent),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function toBookingItem(doc: any): BookingItem {
  const guests = typeof doc.guests === "string" ? JSON.parse(doc.guests) : doc.guests;
  const pricing = typeof doc.pricing === "string" ? JSON.parse(doc.pricing) : doc.pricing;
  return {
    id: doc.id ?? doc._id?.toString(),
    bookingId: typeof doc.bookingId === "object" ? doc.bookingId.toString() : doc.bookingId,
    roomTypeId: doc.roomTypeId ? (typeof doc.roomTypeId === "object" ? doc.roomTypeId.toString() : doc.roomTypeId) : "",
    roomId: doc.roomId ? (typeof doc.roomId === "object" ? doc.roomId.toString() : doc.roomId) : null,
    ratePlanId: doc.ratePlanId ? (typeof doc.ratePlanId === "object" ? doc.ratePlanId.toString() : doc.ratePlanId) : "",
    roomNameSnapshot: doc.roomNameSnapshot,
    roomNumberSnapshot: doc.roomNumberSnapshot ?? null,
    ratePlanNameSnapshot: doc.ratePlanNameSnapshot,
    checkIn: doc.checkIn,
    checkOut: doc.checkOut,
    guests: { adults: guests?.adults ?? 0, children: guests?.children ?? 0 },
    pricing: {
      nightlyRates: (pricing?.nightlyRates ?? []).map((night: any) => ({
        date: new Date(night.date),
        amount: night.amount,
      })),
      subtotal: pricing?.subtotal ?? 0,
      discount: pricing?.discount ?? 0,
      taxes: pricing?.taxes ?? 0,
      fees: pricing?.fees ?? 0,
      total: pricing?.total ?? 0,
      currency: pricing?.currency ?? "GBP",
    },
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreateBookingRecord {
  propertyId: string;
  userId: string | null;
  bookingNumber: string;
  status: BookingStatus;
  checkIn: Date;
  checkOut: Date;
  guests: Booking["guests"];
  contact: Booking["contact"];
  pricing: Booking["pricing"];
  hold: { holdId: string | null; expiresAt: Date | null };
  source: Booking["source"];
  notes?: string | null;
}

export interface CreateBookingItemRecord {
  bookingId: string;
  roomTypeId: string;
  roomId: string;
  ratePlanId: string;
  roomNameSnapshot: string;
  roomNumberSnapshot: string | null;
  ratePlanNameSnapshot: string;
  checkIn: Date;
  checkOut: Date;
  guests: Booking["guests"];
  pricing: BookingItem["pricing"];
}

export async function createBookingWithItems(
  booking: CreateBookingRecord,
  items: CreateBookingItemRecord[],
  _session?: unknown,
): Promise<BookingDocLike> {
  const bookingId = newId();
  const createdBooking = await prisma.booking.create({
    data: {
      id: bookingId,
      bookingNumber: booking.bookingNumber,
      propertyId: booking.propertyId,
      userId: booking.userId,
      status: booking.status,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      guests: booking.guests as any,
      contact: booking.contact as any,
      pricing: booking.pricing as any,
      hold: booking.hold as any,
      cancellation: { cancelledAt: null, cancelledBy: null, reason: null },
      stay: { checkedInAt: null, checkedInBy: null, checkedOutAt: null, checkedOutBy: null },
      source: booking.source,
      notes: booking.notes ?? null,
      reminderSent: false,
    },
  });

  if (items.length > 0) {
    await prisma.bookingItem.createMany({
      data: items.map((item) => ({
        id: newId(),
        bookingId,
        roomTypeId: item.roomTypeId,
        roomId: item.roomId || null,
        ratePlanId: item.ratePlanId,
        roomNameSnapshot: item.roomNameSnapshot,
        roomNumberSnapshot: item.roomNumberSnapshot ?? null,
        ratePlanNameSnapshot: item.ratePlanNameSnapshot,
        checkIn: item.checkIn,
        checkOut: item.checkOut,
        guests: item.guests as any,
        pricing: item.pricing as any,
      })),
    });
  }

  return {
    ...toBooking(createdBooking),
    _id: { toString: () => createdBooking.id },
  };
}

export async function findBookingById(id: string): Promise<Booking | null> {
  const doc = await prisma.booking.findUnique({ where: { id } });
  return doc ? toBooking(doc) : null;
}

export async function findBookingItems(bookingId: string): Promise<BookingItem[]> {
  const docs = await prisma.bookingItem.findMany({ where: { bookingId } });
  return docs.map(toBookingItem);
}

export async function updateBookingItem(
  id: string,
  data: Partial<Pick<BookingItem, "roomId" | "roomNumberSnapshot">>,
): Promise<BookingItem | null> {
  const doc = await prisma.bookingItem.update({
    where: { id },
    data,
  });
  return toBookingItem(doc);
}

/**
 * Room ids with overlapping inventory-blocking reservations.
 * CONFIRMED/CHECKED_IN always block; HELD/PAYMENT_PENDING block only
 * while their hold is still alive. The authoritative double-booking guard.
 */
export async function findConflictingBookingRoomIds(
  roomIds: string[],
  checkIn: Date,
  checkOut: Date,
  now: Date = new Date(),
): Promise<Set<string>> {
  if (roomIds.length === 0) return new Set();
  const items = await prisma.bookingItem.findMany({
    where: {
      roomId: { in: roomIds },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
    select: { bookingId: true, roomId: true },
  });
  if (items.length === 0) return new Set();
  const bookingIds = [...new Set(items.map((item) => item.bookingId))];
  const blockers = await prisma.booking.findMany({
    where: {
      id: { in: bookingIds },
      OR: [
        { status: { in: INVENTORY_BLOCKING_STATUSES } },
        { status: { in: HOLD_STATUSES } },
      ],
    },
    select: { id: true, status: true, hold: true },
  });
  const blockerIds = new Set(
    blockers
      .filter((b) => {
        if (INVENTORY_BLOCKING_STATUSES.includes(b.status as BookingStatus)) return true;
        const hold = typeof b.hold === "string" ? JSON.parse(b.hold) : b.hold;
        if (hold?.expiresAt && new Date(hold.expiresAt) > now) return true;
        return false;
      })
      .map((b) => b.id),
  );
  return new Set(
    items
      .filter((item) => blockerIds.has(item.bookingId))
      .map((item) => item.roomId as string)
      .filter(Boolean),
  );
}

export interface ListMyBookingsFilter extends PaginationQuery {
  status?: BookingStatus;
}

export async function listBookingsByUser(
  userId: string,
  filter: ListMyBookingsFilter,
): Promise<Paginated<Booking>> {
  const { page, limit, status } = filter;
  const where: any = { userId };
  if (status) where.status = status;
  const [total, docs] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return paginatedResponse(
    docs.map(toBooking),
    page,
    limit,
    total,
  );
}

export interface ListBookingsFilter extends PaginationQuery {
  status?: BookingStatus;
  q?: string;
  checkInFrom?: Date;
  checkOutTo?: Date;
}

export async function listBookings(filter: ListBookingsFilter): Promise<Paginated<Booking>> {
  const { page, limit, status, q, checkInFrom, checkOutTo } = filter;
  const where: any = {};
  if (status) where.status = status;
  if (checkInFrom || checkOutTo) {
    where.checkIn = {};
    if (checkInFrom) where.checkIn.gte = checkInFrom;
    if (checkOutTo) where.checkIn.lte = checkOutTo;
  }
  if (q) {
    where.OR = [
      { bookingNumber: { contains: q } },
      { contact: { path: ["email"], string_contains: q } },
    ];
  }
  const [total, docs] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return paginatedResponse(
    docs.map(toBooking),
    page,
    limit,
    total,
  );
}

export async function setBookingStatus(
  id: string,
  status: BookingStatus,
  extra: Record<string, unknown> = {},
  _session?: unknown,
): Promise<Booking | null> {
  try {
    const doc = await prisma.booking.update({
      where: { id },
      data: {
        status,
        ...(extra as any),
      },
    });
    return toBooking(doc);
  } catch {
    return null;
  }
}

/** Lazy expiry sweep for holds whose time ran out. No worker required. */
export async function expireOverdueHolds(now: Date = new Date()): Promise<number> {
  const affected = await prisma.$executeRawUnsafe(
    "UPDATE bookings SET status = 'EXPIRED' WHERE status IN ('HELD', 'PAYMENT_PENDING') AND JSON_UNQUOTE(JSON_EXTRACT(hold, '$.expiresAt')) <= ?",
    now.toISOString(),
  );
  return Number(affected);
}

/**
 * Reminder sweep input: CONFIRMED bookings checking in before `before`
 * that have not been reminded yet (docs 06 §41).
 */
export async function findBookingsForReminderSweep(before: Date): Promise<Booking[]> {
  const docs = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      reminderSent: false,
      checkIn: { lte: before },
    },
    orderBy: { checkIn: "asc" },
    take: 100,
  });
  return docs.map(toBooking);
}

export async function markReminderSent(id: string): Promise<void> {
  await prisma.booking.update({
    where: { id },
    data: { reminderSent: true },
  });
}

/** Prior uses of a coupon code by a user (live bookings only, case-insensitive). */
export async function countUserCouponUses(userId: string, normalizedCode: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
    "SELECT COUNT(*) as count FROM bookings WHERE userId = ? AND UPPER(JSON_UNQUOTE(JSON_EXTRACT(pricing, '$.couponCode'))) = ? AND status NOT IN ('CANCELLED', 'EXPIRED')",
    userId,
    normalizedCode.toUpperCase(),
  );
  return Number(rows[0]?.count ?? 0);
}
