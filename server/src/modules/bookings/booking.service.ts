import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { AppError } from "../../utils/app-error";
import { computeNights, isPlanApplicable } from "../availability/search.service";
import { isValidStayRange } from "../../utils/availability";
import { cacheStore } from "../../config/cache";
import { isDuplicateKeyError } from "../../utils/mongo";
import { findHeldRoomIds, releaseBookingHolds, writeRoomHold } from "./hold.store";
import { ensureProperty } from "../properties/property.service";
import { consumeCouponUsage } from "../coupons/coupon.repository";
import { evaluateCoupon } from "../coupons/coupon.service";
import { findOverlappingBlockedRoomIds } from "../availability/availability-block.repository";
import { findRatePlanById } from "../ratePlans/rate-plan.repository";
import { findRoomTypeById } from "../roomTypes/room-type.repository";
import { listRooms } from "../rooms/room.repository";
import {
  createBookingWithItems,
  expireOverdueHolds,
  findBookingById,
  findBookingItems,
  findConflictingBookingRoomIds,
  generateBookingNumber,
  listBookingsByUser,
  setBookingStatus,
} from "./booking.repository";
import type {
  CreateBookingItemRecord,
  CreateBookingRecord,
} from "./booking.repository";
import type {
  CreateBookingInput,
  MyBookingsQuery,
} from "./booking.schema";
import type { Booking, BookingItem, BookingStatus } from "./booking.types";
import type { Paginated } from "../../utils/pagination";

const HOLD_TTL_SECONDS = 15 * 60;
const IDEMPOTENCY_TTL_SECONDS = 24 * 60 * 60;
const BOOKING_NUMBER_ATTEMPTS = 5;

/**
 * Pure hold-expiry rule, unit-tested. Only HELD/PAYMENT_PENDING with a past
 * hold timestamp expire; everything else is terminal or active.
 */
export function shouldExpireHold(
  status: BookingStatus,
  expiresAt: Date | null,
  now: Date = new Date(),
): boolean {
  if (status !== "HELD" && status !== "PAYMENT_PENDING") return false;
  if (!expiresAt) return false;
  return expiresAt.getTime() <= now.getTime();
}

function nightlySchedule(checkIn: Date, nights: number, perNight: number): Array<{ date: Date; amount: number }> {
  const schedule: Array<{ date: Date; amount: number }> = [];
  for (let i = 0; i < nights; i += 1) {
    schedule.push({ date: new Date(checkIn.getTime() + i * 24 * 60 * 60 * 1000), amount: perNight });
  }
  return schedule;
}

interface PricedLine {
  roomTypeId: string;
  roomTypeName: string;
  ratePlanId: string;
  ratePlanName: string;
  quantity: number;
  currency: string;
  unitSubtotal: number;
  lineSubtotal: number;
  lineDiscount: number;
  couponId: string | null;
  nightlyRates: Array<{ date: Date; amount: number }>;
  allocated: Array<{ id: string; name: string; roomNumber: string }>;
}

export async function createBooking(
  userId: string,
  input: CreateBookingInput,
  idempotencyKey?: string,
): Promise<{ booking: Booking; items: BookingItem[]; idempotentReplay: boolean }> {
  const { checkIn, checkOut } = input;
  if (!isValidStayRange(checkIn, checkOut)) {
    throw new AppError("Check-out must be after check-in and in the future", 400, "INVALID_DATE_RANGE");
  }
  const nights = computeNights(checkIn, checkOut);
  const property = await ensureProperty();

  if (idempotencyKey) {
    const replayId = cacheStore.get<string>(`idempotency:${idempotencyKey}`);
    if (replayId) {
      const existing = await findBookingById(replayId);
      if (existing && existing.userId === userId) {
        return { booking: existing, items: await findBookingItems(existing.id), idempotentReplay: true };
      }
    }
  }

  // Price + validate every line first: fail before touching inventory.
  const lines: PricedLine[] = [];
  for (const line of input.rooms) {
    const roomType = await findRoomTypeById(line.roomTypeId);
    if (!roomType || roomType.status !== "ACTIVE" || roomType.propertyId !== property.id) {
      throw new AppError("Room type not found", 404, "ROOM_TYPE_NOT_FOUND");
    }
    if (
      input.guests.adults > roomType.maxAdults ||
      input.guests.adults + input.guests.children > roomType.maxOccupancy
    ) {
      throw new AppError(`Guests exceed ${roomType.name} occupancy`, 400, "OCCUPANCY_EXCEEDED");
    }
    const plan = await findRatePlanById(line.ratePlanId);
    if (!plan) {
      throw new AppError("Rate plan not found", 404, "RATE_PLAN_NOT_FOUND");
    }
    if (plan.roomTypeId !== roomType.id) {
      throw new AppError("Rate plan does not belong to this room type", 400, "RATE_PLAN_MISMATCH");
    }
    if (!isPlanApplicable(plan, checkIn, checkOut, nights)) {
      throw new AppError("Rate plan is not applicable to these dates", 400, "RATE_PLAN_INACTIVE");
    }

    const unitSubtotal = plan.pricing.type === "PER_NIGHT" ? plan.pricing.amount * nights : plan.pricing.amount;
    const lineSubtotal = unitSubtotal * line.quantity;
    let lineDiscount = 0;
    let couponId: string | null = null;
    if (input.couponCode) {
      // Per-line evaluation (documented semantic): minimums apply per line.
      const evaluation = await evaluateCoupon(property.id, input.couponCode, {
        roomTypeId: roomType.id,
        subtotal: lineSubtotal,
      });
      if (!evaluation.valid) {
        throw new AppError("Coupon cannot be applied", 422, evaluation.reason ?? "COUPON_INVALID");
      }
      lineDiscount = evaluation.discount;
      couponId = evaluation.couponId ?? null;
    }
    const perNight = plan.pricing.type === "PER_NIGHT" ? plan.pricing.amount : Math.round(lineSubtotal / nights);
    lines.push({
      roomTypeId: roomType.id,
      roomTypeName: roomType.name,
      ratePlanId: plan.id,
      ratePlanName: plan.name,
      quantity: line.quantity,
      currency: plan.pricing.currency,
      unitSubtotal,
      lineSubtotal,
      lineDiscount,
      couponId,
      nightlyRates: nightlySchedule(checkIn, nights, perNight),
      allocated: [],
    });
  }

  const currency = lines[0]?.currency ?? "INR";
  for (const line of lines) {
    if (line.currency !== currency) {
      throw new AppError("Mixed currencies are not supported in one booking", 400, "CURRENCY_MISMATCH");
    }
  }
  const subtotal = lines.reduce((sum, line) => sum + line.lineSubtotal, 0);
  const discount = lines.reduce((sum, line) => sum + line.lineDiscount, 0);
  const couponId = lines.find((line) => line.couponId)?.couponId ?? null;

  // Allocate distinct physical rooms. Cache holds are the fast path;
  // the transaction below rechecks the database as the authority.
  const holdId = `hold_${randomBytes(9).toString("hex")}`;
  const holdExpiresAt = new Date(Date.now() + HOLD_TTL_SECONDS * 1000);
  const allocatedRoomIds: string[] = [];
  try {
    const blockedByBlock = await findOverlappingBlockedRoomIds(checkIn, checkOut);
  for (const line of lines) {
    const page = await listRooms({ page: 1, limit: 2000, roomTypeId: line.roomTypeId, status: "ACTIVE" });
    const candidateIds = page.data.map((room) => room.id);
    const conflicts = await findConflictingBookingRoomIds(candidateIds, checkIn, checkOut);
    const heldIds = findHeldRoomIds(candidateIds, checkIn, checkOut);
    const free = page.data.filter(
      (room) =>
        !blockedByBlock.has(room.id) &&
        !conflicts.has(room.id) &&
        !heldIds.has(room.id) &&
        !allocatedRoomIds.includes(room.id),
    );
      if (free.length < line.quantity) {
        throw new AppError("Selected rooms are no longer available", 409, "ROOM_NO_LONGER_AVAILABLE");
      }
      for (let i = 0; i < line.quantity; i += 1) {
        const room = free[i];
        allocatedRoomIds.push(room.id);
        line.allocated.push({ id: room.id, name: room.name, roomNumber: room.roomNumber });
        writeRoomHold(room.id, {
          checkIn: checkIn.toISOString(),
          checkOut: checkOut.toISOString(),
          holdId,
        });
      }
    }
  } catch (error) {
    releaseBookingHolds(allocatedRoomIds, holdId);
    throw error;
  }

  // Persist transactionally. Retries only on booking-number collision;
  // a real inventory conflict aborts immediately with 409.
  let attemptError: unknown = null;
  for (let attempt = 0; attempt < BOOKING_NUMBER_ATTEMPTS; attempt += 1) {
    const session = await mongoose.startSession();
    try {
      const bookingRecord: CreateBookingRecord = {
        propertyId: property.id,
        userId,
        bookingNumber: generateBookingNumber(),
        status: "HELD",
        checkIn,
        checkOut,
        guests: { adults: input.guests.adults, children: input.guests.children },
        contact: { ...input.contact },
        pricing: {
          currency,
          subtotal,
          discount,
          taxes: 0,
          fees: 0,
          total: subtotal - discount,
          couponCode: input.couponCode ?? null,
        },
        hold: { holdId, expiresAt: holdExpiresAt },
        source: "DIRECT",
        notes: input.notes ?? null,
      };
      const itemRecords: CreateBookingItemRecord[] = [];
      for (const line of lines) {
        const perRoomDiscount = Math.floor(line.lineDiscount / line.allocated.length);
        line.allocated.forEach((room, index) => {
          const last = index === line.allocated.length - 1;
          const discountShare = last
            ? line.lineDiscount - perRoomDiscount * (line.allocated.length - 1)
            : perRoomDiscount;
          const roomSubtotal = line.unitSubtotal;
          itemRecords.push({
            bookingId: "",
            roomTypeId: line.roomTypeId,
            roomId: room.id,
            ratePlanId: line.ratePlanId,
            roomNameSnapshot: room.name,
            roomNumberSnapshot: room.roomNumber,
            ratePlanNameSnapshot: line.ratePlanName,
            checkIn,
            checkOut,
            guests: { adults: input.guests.adults, children: input.guests.children },
            pricing: {
              nightlyRates: line.nightlyRates,
              subtotal: roomSubtotal,
              discount: discountShare,
              taxes: 0,
              fees: 0,
              total: roomSubtotal - discountShare,
              currency: line.currency,
            },
          });
        });
      }

      let createdId = "";
      await session.withTransaction(async () => {
        const conflicts = await findConflictingBookingRoomIds(allocatedRoomIds, checkIn, checkOut);
        if (conflicts.size > 0) {
          throw new AppError("Selected rooms are no longer available", 409, "ROOM_NO_LONGER_AVAILABLE");
        }
        if (couponId) {
          const consumed = await consumeCouponUsage(couponId, session);
          if (!consumed) {
            throw new AppError("Coupon usage limit was just reached", 409, "COUPON_LIMIT_REACHED");
          }
        }
        const doc = await createBookingWithItems(bookingRecord, itemRecords, session);
        createdId = doc._id.toString();
      });

      const booking = await findBookingById(createdId);
      if (!booking) {
        throw new AppError("Booking could not be created", 500, "BOOKING_CREATE_FAILED");
      }
      const items = await findBookingItems(booking.id);
      if (idempotencyKey) {
        cacheStore.set(`idempotency:${idempotencyKey}`, booking.id, IDEMPOTENCY_TTL_SECONDS);
      }
      return { booking, items, idempotentReplay: false };
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        attemptError = error;
        continue;
      }
      releaseBookingHolds(allocatedRoomIds, holdId);
      throw error;
    } finally {
      await session.endSession();
    }
  }
  releaseBookingHolds(allocatedRoomIds, holdId);
  throw attemptError ?? new AppError("Booking could not be created", 500, "BOOKING_CREATE_FAILED");
}

export async function getBooking(
  id: string,
  userId: string,
): Promise<{ booking: Booking; items: BookingItem[] }> {
  await expireOverdueHolds();
  const booking = await findBookingById(id);
  if (!booking || booking.userId !== userId) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  if (shouldExpireHold(booking.status, booking.hold.expiresAt)) {
    const expired = await setBookingStatus(booking.id, "EXPIRED");
    if (!expired) {
      throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
    }
    return { booking: expired, items: await findBookingItems(expired.id) };
  }
  return { booking, items: await findBookingItems(booking.id) };
}

export async function listMyBookings(
  userId: string,
  query: MyBookingsQuery,
): Promise<Paginated<Booking>> {
  await expireOverdueHolds();
  return listBookingsByUser(userId, query);
}

const CANCELLABLE: BookingStatus[] = ["HELD", "PAYMENT_PENDING", "CONFIRMED"];

export async function cancelBooking(
  id: string,
  userId: string,
  reason: string | null,
): Promise<Booking> {
  await expireOverdueHolds();
  const booking = await findBookingById(id);
  if (!booking || booking.userId !== userId) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  if (!CANCELLABLE.includes(booking.status)) {
    throw new AppError("This booking can no longer be cancelled", 400, "BOOKING_NOT_CANCELLABLE");
  }
  if (booking.hold.holdId) {
    const items = await findBookingItems(booking.id);
    releaseBookingHolds(
      items.map((item) => item.roomId).filter((roomId): roomId is string => roomId !== null),
      booking.hold.holdId,
    );
  }
  // Refunds for paid bookings attach here in Phase 8; all bookings are
  // unpaid until the payment flow lands (Phase 7).
  const cancelled = await setBookingStatus(booking.id, "CANCELLED", {
    cancellation: { cancelledAt: new Date(), cancelledBy: userId, reason },
    hold: { holdId: null, expiresAt: null },
  });
  if (!cancelled) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  return cancelled;
}
