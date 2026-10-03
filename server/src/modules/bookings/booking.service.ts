import { randomBytes } from "node:crypto";
import mongoose from "mongoose";
import { AppError } from "../../utils/app-error";
import { computeNights, isPlanApplicable } from "../availability/search.service";
import { isValidStayRange } from "../../utils/availability";
import { cacheStore } from "../../config/cache";
import { isDuplicateKeyError } from "../../utils/mongo";
import { findHeldRoomIds, releaseBookingHolds, writeRoomHold } from "./hold.store";
import { evaluateCancellation, resolvePolicy } from "../policies/policy.service";
import type { CancellationEvaluation } from "../policies/policy.service";
import { listPaymentsByBooking } from "../payments/payment.repository";
import { refundPayment } from "../payments/payment.service";
import { sumSucceededRefunds } from "../refunds/refund.model";
import { ensureProperty } from "../properties/property.service";
import { consumeCouponUsage } from "../coupons/coupon.repository";
import { evaluateCoupon } from "../coupons/coupon.service";
import { findOverlappingBlockedRoomIds } from "../availability/availability-block.repository";
import { findRoomById } from "../rooms/room.repository";
import { BookingItemModel } from "./booking-item.model";
import { findRatePlanById } from "../ratePlans/rate-plan.repository";
import { findRoomTypeById } from "../roomTypes/room-type.repository";
import { listRooms } from "../rooms/room.repository";
import { enqueueAdminAlert, enqueueNotification } from "../notifications/notification.service";
import { notificationKeys } from "../notifications/notification.types";
import {
  countUserCouponUses,
  createBookingWithItems,
  expireOverdueHolds,
  findBookingById,
  findBookingItems,
  findConflictingBookingRoomIds,
  generateBookingNumber,
  listBookings,
  listBookingsByUser,
  setBookingStatus,
} from "./booking.repository";
import type {
  CreateBookingItemRecord,
  CreateBookingRecord,
  ListBookingsFilter,
} from "./booking.repository";
import type {
  CreateBookingInput,
  MyBookingsQuery,
} from "./booking.schema";
import type { Booking, BookingItem, BookingStatus } from "./booking.types";
import type { Payment } from "../payments/payment.types";
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
          if (consumed.perUserLimit !== null) {
            const used = await countUserCouponUses(userId, consumed.normalizedCode);
            if (used >= consumed.perUserLimit) {
              throw new AppError(
                "You have already used this coupon the maximum times",
                409,
                "COUPON_LIMIT_REACHED",
              );
            }
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
      await enqueueNotification({
        type: "BOOKING_RECEIVED",
        recipient: booking.contact.email,
        bookingId: booking.id,
        idempotencyKey: notificationKeys.bookingReceived(booking.id),
      });
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

export async function listAllBookings(query: ListBookingsFilter): Promise<Paginated<Booking>> {
  await expireOverdueHolds();
  return listBookings(query);
}

export interface AdminBookingDetail {
  booking: Booking;
  items: BookingItem[];
  payments: Payment[];
}

export async function getBookingAdmin(id: string): Promise<AdminBookingDetail> {
  await expireOverdueHolds();
  const booking = await findBookingById(id);
  if (!booking) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  const [items, payments] = await Promise.all([
    findBookingItems(booking.id),
    listPaymentsByBooking(booking.id),
  ]);
  return { booking, items, payments };
}

const CANCELLABLE: BookingStatus[] = ["HELD", "PAYMENT_PENDING", "CONFIRMED"];

/** Net captured funds: paid amounts minus already-recorded succeeded refunds. */
async function netPaidTotal(bookingId: string): Promise<number> {
  const payments = await listPaymentsByBooking(bookingId);
  let total = 0;
  for (const payment of payments) {
    if (payment.status === "PAID") {
      total += payment.amount;
    } else if (payment.status === "PARTIALLY_REFUNDED") {
      total += Math.max(0, payment.amount - (await sumSucceededRefunds(payment.id)));
    }
  }
  return total;
}

export interface CancellationPreview {
  evaluation: CancellationEvaluation;
  bookingNumber: string;
  status: BookingStatus;
  paidTotal: number;
}

async function resolveCancellableBooking(
  id: string,
  actorUserId: string | null,
): Promise<Booking> {
  await expireOverdueHolds();
  const booking = await findBookingById(id);
  if (!booking || (actorUserId !== null && booking.userId !== actorUserId)) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  if (!CANCELLABLE.includes(booking.status)) {
    throw new AppError("This booking can no longer be cancelled", 400, "BOOKING_NOT_CANCELLABLE");
  }
  return booking;
}

export async function previewCancellation(
  id: string,
  actorUserId: string | null,
): Promise<CancellationPreview> {
  const booking = await resolveCancellableBooking(id, actorUserId);
  const policy = await resolvePolicy(booking.propertyId);
  const paidTotal = await netPaidTotal(booking.id);
  const evaluation = evaluateCancellation({
    status: booking.status,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    paidTotal,
    policy,
  });
  return {
    evaluation,
    bookingNumber: booking.bookingNumber,
    status: booking.status,
    paidTotal,
  };
}

async function performCancel(
  booking: Booking,
  actorId: string,
  reason: string | null,
): Promise<Booking> {
  const policy = await resolvePolicy(booking.propertyId);
  const paidTotal = await netPaidTotal(booking.id);
  const evaluation = evaluateCancellation({
    status: booking.status,
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    paidTotal,
    policy,
  });
  if (!evaluation.isCancellable) {
    throw new AppError(evaluation.reason, 400, "BOOKING_NOT_CANCELLABLE");
  }
  if (booking.hold.holdId) {
    const items = await findBookingItems(booking.id);
    releaseBookingHolds(
      items.map((item) => item.roomId).filter((roomId): roomId is string => roomId !== null),
      booking.hold.holdId,
    );
  }
  const cancelledAt = new Date();
  const notifyCancelled = async (finalBooking: Booking, refundProviderId: string | null) => {
    await enqueueNotification({
      type: "BOOKING_CANCELLED",
      recipient: finalBooking.contact.email,
      bookingId: finalBooking.id,
      idempotencyKey: notificationKeys.bookingCancelled(finalBooking.id),
    });
    await enqueueAdminAlert({
      type: "ADMIN_CANCELLATION",
      bookingId: finalBooking.id,
      idempotencyKey: notificationKeys.adminCancellation(finalBooking.id),
    });
    if (refundProviderId) {
      await enqueueNotification({
        type: "REFUND_UPDATED",
        recipient: finalBooking.contact.email,
        bookingId: finalBooking.id,
        idempotencyKey: notificationKeys.refundUpdated(refundProviderId),
      });
    }
  };
  if (paidTotal > 0 && evaluation.refundAmount > 0) {
    const refunding = await setBookingStatus(booking.id, "REFUND_PENDING", {
      cancellation: { cancelledAt, cancelledBy: actorId, reason },
      hold: { holdId: null, expiresAt: null },
    });
    if (!refunding) {
      throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
    }
    let refundProviderRefundId: string | null = null;
    try {
      const payments = await listPaymentsByBooking(booking.id);
      const source = payments.find((p) => p.status === "PAID" || p.status === "PARTIALLY_REFUNDED");
      if (!source) {
        throw new AppError("No captured payment to refund", 409, "NOTHING_TO_REFUND");
      }
      const { refund } = await refundPayment(source.id, evaluation.refundAmount, actorId);
      refundProviderRefundId = refund.providerRefundId;
    } catch (error) {
      // Booking stays REFUND_PENDING: safe to retry via the refund action.
      // Webhook completion (charge.refunded) moves it to CANCELLED.
      if (error instanceof AppError) throw error;
      throw new AppError("Refund failed, booking held for retry", 502, "REFUND_FAILED");
    }
    const pending = await findBookingById(booking.id);
    if (!pending) {
      throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
    }
    await notifyCancelled(pending, refundProviderRefundId);
    return pending;
  }
  const cancelled = await setBookingStatus(booking.id, "CANCELLED", {
    cancellation: { cancelledAt, cancelledBy: actorId, reason },
    hold: { holdId: null, expiresAt: null },
  });
  if (!cancelled) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  await notifyCancelled(cancelled, null);
  return cancelled;
}

export async function cancelBooking(
  id: string,
  userId: string,
  reason: string | null,
): Promise<Booking> {
  const booking = await resolveCancellableBooking(id, userId);
  return performCancel(booking, userId, reason);
}

export async function adminCancelBooking(
  id: string,
  adminId: string,
  reason: string | null,
): Promise<Booking> {
  const booking = await resolveCancellableBooking(id, null);
  return performCancel(booking, adminId, reason);
}

/**
 * Standalone admin refund: creates a Stripe refund against captured funds
 * without touching booking status. Used for partial post-stay refunds and
 * for retrying a REFUND_PENDING booking whose provider call failed.
 * Webhook delivery finalizes payment states.
 */
export async function adminRefundBooking(
  id: string,
  adminId: string,
  amount: number | null,
): Promise<{ refundId: string; amount: number }> {
  const booking = await findBookingById(id);
  if (!booking) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  if (
    booking.status !== "CONFIRMED" &&
    booking.status !== "REFUND_PENDING" &&
    booking.status !== "CHECKED_OUT"
  ) {
    throw new AppError("This booking has no refundable state", 400, "BOOKING_NOT_REFUNDABLE");
  }
  const payments = await listPaymentsByBooking(booking.id);
  const source = payments.find((p) => p.status === "PAID" || p.status === "PARTIALLY_REFUNDED");
  if (!source) {
    throw new AppError("No captured payment to refund", 409, "NOTHING_TO_REFUND");
  }
  const refundedSoFar = await sumSucceededRefunds(source.id);
  const remaining = source.amount - refundedSoFar;
  if (remaining <= 0) {
    throw new AppError("Nothing left to refund on this payment", 400, "NOTHING_TO_REFUND");
  }
  const refundAmount = amount ?? remaining;
  if (!Number.isInteger(refundAmount) || refundAmount <= 0 || refundAmount > remaining) {
    throw new AppError("Refund amount exceeds the refundable balance", 400, "REFUND_EXCEEDS_CAPTURED");
  }
  const { refund } = await refundPayment(source.id, refundAmount, adminId);
  await enqueueNotification({
    type: "REFUND_UPDATED",
    recipient: booking.contact.email,
    bookingId: booking.id,
    paymentId: source.id,
    idempotencyKey: notificationKeys.refundUpdated(refund.providerRefundId),
  });
  return { refundId: refund.id, amount: refund.amount };
}

/**
 * Pure check-in gate (docs 07 §27): CONFIRMED + captured payment + guest
 * contact present + check-in day reached. Unit-tested; the service
 * re-checks against fresh state.
 */
export function checkInBlockReason(booking: Booking, now: Date = new Date()): string | null {
  if (booking.status !== "CONFIRMED") return "Only confirmed bookings can be checked in";
  if (booking.paymentStatus !== "PAID") return "Payment must be captured before check-in";
  if (!booking.contact.email || !booking.contact.firstName) {
    return "Guest details are required before check-in";
  }
  const checkInDay = new Date(booking.checkIn);
  checkInDay.setUTCHours(0, 0, 0, 0);
  if (now.getTime() < checkInDay.getTime()) return "Check-in day has not arrived yet";
  return null;
}

export function checkOutBlockReason(booking: Booking): string | null {
  if (booking.status !== "CHECKED_IN") return "Only checked-in bookings can be checked out";
  return null;
}

export async function checkInBooking(id: string, adminId: string): Promise<Booking> {
  const booking = await findBookingById(id);
  if (!booking) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  const blocked = checkInBlockReason(booking);
  if (blocked) {
    throw new AppError(blocked, 400, "CHECKIN_NOT_ALLOWED");
  }
  const checkedIn = await setBookingStatus(booking.id, "CHECKED_IN", {
    stay: {
      checkedInAt: new Date(),
      checkedInBy: adminId,
      checkedOutAt: null,
      checkedOutBy: null,
    },
  });
  if (!checkedIn) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  await enqueueNotification({
    type: "CHECKED_IN",
    recipient: checkedIn.contact.email,
    bookingId: checkedIn.id,
    idempotencyKey: notificationKeys.checkedIn(checkedIn.id),
  });
  return checkedIn;
}

export async function checkOutBooking(id: string, adminId: string): Promise<Booking> {  const booking = await findBookingById(id);
  if (!booking) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  const blocked = checkOutBlockReason(booking);
  if (blocked) {
    throw new AppError(blocked, 400, "CHECKOUT_NOT_ALLOWED");
  }
  const checkedOut = await setBookingStatus(booking.id, "CHECKED_OUT", {
    stay: {
      checkedInAt: booking.stay.checkedInAt,
      checkedInBy: booking.stay.checkedInBy,
      checkedOutAt: new Date(),
      checkedOutBy: adminId,
    },
  });
  if (!checkedOut) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  await enqueueNotification({
    type: "CHECKED_OUT",
    recipient: checkedOut.contact.email,
    bookingId: checkedOut.id,
    idempotencyKey: notificationKeys.checkedOut(checkedOut.id),
  });
  return checkedOut;
}

/**
 * Moves a booking to a different free room of the same type
 * (docs 07 §29). Only single-room bookings qualify — multi-room stays
 * need per-item handling the API does not offer yet.
 */
export async function reassignBookingRoom(
  id: string,
  newRoomId: string,
  // Actor is recorded by the controller audit row; the move itself is actor-free.
  _adminId: string,
): Promise<Booking> {
  const booking = await findBookingById(id);
  if (!booking) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  if (booking.status !== "CONFIRMED" && booking.status !== "CHECKED_IN") {
    throw new AppError("Only active stays can be reassigned", 400, "REASSIGN_NOT_ALLOWED");
  }
  const items = await findBookingItems(booking.id);
  if (items.length !== 1 || !items[0]) {
    throw new AppError("Only single-room bookings can be reassigned", 400, "REASSIGN_NOT_ALLOWED");
  }
  const item = items[0];
  const room = await findRoomById(newRoomId);
  if (!room || room.propertyId !== booking.propertyId) {
    throw new AppError("Room not found", 404, "ROOM_NOT_FOUND");
  }
  if (room.status !== "ACTIVE") {
    throw new AppError("Target room is not sellable", 400, "REASSIGN_NOT_ALLOWED");
  }
  if (room.roomTypeId !== item.roomTypeId) {
    throw new AppError("Target room must be the same room type", 400, "REASSIGN_NOT_ALLOWED");
  }
  if (room.id === item.roomId) {
    throw new AppError("Booking is already in this room", 400, "REASSIGN_NOT_ALLOWED");
  }
  const [blocked, conflicting] = await Promise.all([
    findOverlappingBlockedRoomIds(booking.checkIn, booking.checkOut),
    findConflictingBookingRoomIds([room.id], booking.checkIn, booking.checkOut),
  ]);
  if (blocked.has(room.id) || conflicting.has(room.id)) {
    throw new AppError("Target room is not free for this stay", 409, "ROOM_NO_LONGER_AVAILABLE");
  }
  await BookingItemModel.findByIdAndUpdate(item.id, {
    $set: { roomId: room.id, roomNumberSnapshot: room.roomNumber },
  }).exec();
  const updated = await findBookingById(booking.id);
  if (!updated) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  return updated;
}
