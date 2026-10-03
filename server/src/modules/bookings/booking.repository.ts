import mongoose from "mongoose";
import type { ClientSession, QueryFilter } from "mongoose";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { HOLD_STATUSES, INVENTORY_BLOCKING_STATUSES } from "./booking.types";
import type { Booking, BookingItem, BookingStatus } from "./booking.types";
import { BookingItemModel } from "./booking-item.model";
import type { BookingItemDocument } from "./booking-item.model";
import { BookingModel } from "./booking.model";
import type { BookingDocument } from "./booking.model";

const BOOKING_NUMBER_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Human-readable unique reference (never the Mongo _id). Retried on collision. */
export function generateBookingNumber(): string {
  let suffix = "";
  for (let i = 0; i < 6; i += 1) {
    suffix += BOOKING_NUMBER_ALPHABET[Math.floor(Math.random() * BOOKING_NUMBER_ALPHABET.length)];
  }
  return `QB-${suffix}`;
}

export function toBooking(doc: BookingDocument): Booking {
  return {
    id: doc._id.toString(),
    bookingNumber: doc.bookingNumber,
    propertyId: doc.propertyId.toString(),
    userId: doc.userId ? doc.userId.toString() : null,
    status: doc.status,
    paymentStatus: doc.paymentStatus,
    checkIn: doc.checkIn,
    checkOut: doc.checkOut,
    guests: { adults: doc.guests.adults, children: doc.guests.children },
    contact: {
      firstName: doc.contact.firstName,
      lastName: doc.contact.lastName,
      email: doc.contact.email,
      phone: doc.contact.phone,
    },
    pricing: {
      currency: doc.pricing.currency,
      subtotal: doc.pricing.subtotal,
      discount: doc.pricing.discount,
      taxes: doc.pricing.taxes,
      fees: doc.pricing.fees,
      total: doc.pricing.total,
      couponCode: doc.pricing.couponCode,
    },
    cancellation: {
      cancelledAt: doc.cancellation.cancelledAt,
      cancelledBy: doc.cancellation.cancelledBy ? doc.cancellation.cancelledBy.toString() : null,
      reason: doc.cancellation.reason,
    },
    hold: { holdId: doc.hold.holdId, expiresAt: doc.hold.expiresAt },
    source: doc.source,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export function toBookingItem(doc: BookingItemDocument): BookingItem {
  return {
    id: doc._id.toString(),
    bookingId: doc.bookingId.toString(),
    roomTypeId: doc.roomTypeId.toString(),
    roomId: doc.roomId ? doc.roomId.toString() : null,
    ratePlanId: doc.ratePlanId.toString(),
    roomNameSnapshot: doc.roomNameSnapshot,
    roomNumberSnapshot: doc.roomNumberSnapshot,
    ratePlanNameSnapshot: doc.ratePlanNameSnapshot,
    checkIn: doc.checkIn,
    checkOut: doc.checkOut,
    guests: { adults: doc.guests.adults, children: doc.guests.children },
    pricing: {
      nightlyRates: doc.pricing.nightlyRates.map((night) => ({
        date: night.date,
        amount: night.amount,
      })),
      subtotal: doc.pricing.subtotal,
      discount: doc.pricing.discount,
      taxes: doc.pricing.taxes,
      fees: doc.pricing.fees,
      total: doc.pricing.total,
      currency: doc.pricing.currency,
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
  session: ClientSession,
): Promise<BookingDocument> {
  const created = await BookingModel.create([booking], { session });
  const doc = created[0];
  await BookingItemModel.create(
    items.map((item) => ({ ...item, bookingId: doc._id })),
    { session },
  );
  return doc;
}

export async function findBookingById(id: string): Promise<Booking | null> {
  const doc = await BookingModel.findById(id).exec();
  return doc ? toBooking(doc) : null;
}

export async function findBookingItems(bookingId: string): Promise<BookingItem[]> {
  const docs = await BookingItemModel.find({ bookingId }).exec();
  return docs.map((doc) => toBookingItem(doc));
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
  const items = await BookingItemModel.find({
    roomId: { $in: roomIds.map((id) => new mongoose.Types.ObjectId(id)) },
    checkIn: { $lt: checkOut },
    checkOut: { $gt: checkIn },
  })
    .select("bookingId roomId")
    .exec();
  if (items.length === 0) return new Set();
  const bookingIds = [...new Set(items.map((item) => item.bookingId.toString()))];
  const blockers = await BookingModel.find({
    _id: { $in: bookingIds },
    $or: [
      { status: { $in: INVENTORY_BLOCKING_STATUSES } },
      { status: { $in: HOLD_STATUSES }, "hold.expiresAt": { $gt: now } },
    ],
  })
    .select("_id")
    .exec();
  const blockerIds = new Set(blockers.map((booking) => booking._id.toString()));
  return new Set(
    items
      .filter((item) => blockerIds.has(item.bookingId.toString()))
      .map((item) => item.roomId?.toString() ?? ""),
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
  const query: QueryFilter<BookingDocument> = { userId };
  if (status) query.status = status;
  const [total, docs] = await Promise.all([
    BookingModel.countDocuments(query).exec(),
    BookingModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map((doc) => toBooking(doc)),
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
  const query: QueryFilter<BookingDocument> = {};
  if (status) query.status = status;
  if (checkInFrom || checkOutTo) {
    query.checkIn = {};
    if (checkInFrom) query.checkIn.$gte = checkInFrom;
    if (checkOutTo) query.checkIn.$lte = checkOutTo;
  }
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ bookingNumber: pattern }, { "contact.email": pattern }];
  }
  const [total, docs] = await Promise.all([
    BookingModel.countDocuments(query).exec(),
    BookingModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map((doc) => toBooking(doc)),
    page,
    limit,
    total,
  );
}

export async function setBookingStatus(
  id: string,
  status: BookingStatus,
  extra: Record<string, unknown> = {},
  session?: ClientSession,
): Promise<Booking | null> {
  const doc = await BookingModel.findByIdAndUpdate(
    id,
    { $set: { status, ...extra } },
    { new: true, session },
  ).exec();
  return doc ? toBooking(doc) : null;
}

/** Lazy expiry sweep for holds whose time ran out. No worker required. */
export async function expireOverdueHolds(now: Date = new Date()): Promise<number> {
  const result = await BookingModel.updateMany(
    { status: { $in: HOLD_STATUSES }, "hold.expiresAt": { $lte: now } },
    { $set: { status: "EXPIRED" } },
  ).exec();
  return result.modifiedCount;
}
