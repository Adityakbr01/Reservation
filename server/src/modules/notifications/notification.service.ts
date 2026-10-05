import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/app-error";
import { findBookingById, findBookingItems } from "../bookings/booking.repository";
import {
  findBookingsForReminderSweep,
  markReminderSent,
} from "../bookings/booking.repository";
import { notificationKeys } from "./notification.types";
import { listPaymentsByBooking } from "../payments/payment.repository";
import { findLatestRefundForPayment, sumSucceededRefunds } from "../refunds/refund.model";
import { findRoomTypeById } from "../roomTypes/room-type.repository";
import { getProperty } from "../properties/property.service";
import { resolvePolicy } from "../policies/policy.service";
import { getSiteSettings } from "../settings/settings.model";
import { getEmailProvider } from "../../emails/email.provider";
import {
  claimDueNotification,
  findNotificationById,
  insertNotification,
  listNotifications,
  markNotificationFailed,
  markNotificationRetry,
  markNotificationSent,
  requeueNotification,
} from "./notification.model";
import type { ListNotificationsFilter } from "./notification.model";
import {
  adminAlertEmail,
  bookingCancelledEmail,
  bookingConfirmedEmail,
  bookingReceivedEmail,
  checkedInEmail,
  checkedOutEmail,
  checkinReminderEmail,
  paymentFailedEmail,
  refundUpdatedEmail,
} from "../../emails";
import type { BookingEmailContext, RenderedEmail } from "../../emails";
import {
  MAX_ATTEMPTS,
  nextRetryDelayMs,
} from "./notification.types";
import type { Notification, NotificationType } from "./notification.types";

export interface EnqueueInput {
  type: NotificationType;
  recipient: string;
  bookingId?: string | null;
  paymentId?: string | null;
  idempotencyKey: string;
}

/**
 * Queues a notification. Returns null when the same event was already
 * queued/sent (idempotent). Never throws into booking/payment flows —
 * use this (not insertNotification) from domain hooks.
 */
export async function enqueueNotification(input: EnqueueInput): Promise<Notification | null> {
  try {
    return await insertNotification(input);
  } catch (error) {
    logger.error("Notification enqueue failed", {
      type: input.type,
      key: input.idempotencyKey,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

function formatDate(value: Date): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function nightsBetween(checkIn: Date, checkOut: Date): number {
  return Math.max(
    0,
    Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000),
  );
}

export interface BookingEmailSnapshot extends BookingEmailContext {
  bookingId: string;
  holdExpiresAt: string;
}

/** Fresh render context at send time — never a stale enqueue snapshot. */
export async function loadBookingEmailSnapshot(
  bookingId: string,
): Promise<BookingEmailSnapshot | null> {
  const booking = await findBookingById(bookingId);
  if (!booking) return null;
  const [items, property, policy] = await Promise.all([
    findBookingItems(booking.id),
    getProperty(),
    resolvePolicy(booking.propertyId).catch(() => null),
  ]);
  const roomNames = (
    await Promise.all(
      items.map((item) =>
        item.roomTypeId ? findRoomTypeById(item.roomTypeId) : Promise.resolve(null),
      ),
    )
  ).filter((roomType): roomType is NonNullable<typeof roomType> => roomType !== null);
  const roomSummary =
    roomNames.length > 0
      ? roomNames.map((roomType) => roomType.name).join(", ")
      : `${items.length} room${items.length === 1 ? "" : "s"}`;
  const payments = await listPaymentsByBooking(booking.id).catch(() => []);
  const paid = payments
    .filter((payment) => payment.status === "PAID")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const partialRefunded = (
    await Promise.all(
      payments
        .filter((payment) => payment.status === "PARTIALLY_REFUNDED")
        .map((payment) => sumSucceededRefunds(payment.id).then((refunded) => payment.amount - refunded)),
    )
  ).reduce((sum, rest) => sum + rest, 0);
  const propertyName = property?.name ?? "Our property";
  return {
    bookingId: booking.id,
    guestName: `${booking.contact.firstName} ${booking.contact.lastName}`.trim() || "Guest",
    bookingReference: booking.bookingNumber,
    propertyName,
    roomSummary,
    checkIn: formatDate(booking.checkIn),
    checkOut: formatDate(booking.checkOut),
    nights: nightsBetween(booking.checkIn, booking.checkOut),
    guests: `${booking.guests.adults} adult${booking.guests.adults === 1 ? "" : "s"}${
      booking.guests.children > 0 ? `, ${booking.guests.children} child${booking.guests.children === 1 ? "" : "ren"}` : ""
    }`,
    currency: booking.pricing.currency,
    subtotal: booking.pricing.subtotal,
    discount: booking.pricing.discount,
    taxes: booking.pricing.taxes,
    fees: booking.pricing.fees,
    total: booking.pricing.total,
    totalPaid: paid + partialRefunded,
    paymentStatus: booking.paymentStatus.toLowerCase(),
    cancellationPolicy: policy
      ? `Free cancellation until ${policy.freeCancellationHours}h before check-in (${policy.refundPercentage}% refund).`
      : "See the cancellation policy on our website.",
    supportEmail: env.EMAIL_REPLY_TO ?? env.EMAIL_FROM,
    manageUrl: `${env.CLIENT_URL}/bookings`,
    holdExpiresAt: booking.hold.expiresAt ? new Date(booking.hold.expiresAt).toISOString() : "—",
  };
}

function adminUrl(bookingId: string): string {
  return `${env.ADMIN_URL}/reservations/${bookingId}`;
}

function renderFor(
  notification: Notification,
  snapshot: BookingEmailSnapshot,
): RenderedEmail | null {
  switch (notification.type) {
    case "BOOKING_RECEIVED":
      return bookingReceivedEmail(snapshot);
    case "BOOKING_CONFIRMED":
      return bookingConfirmedEmail(snapshot);
    case "PAYMENT_FAILED":
      return paymentFailedEmail({
        guestName: snapshot.guestName,
        bookingReference: snapshot.bookingReference,
        holdExpiresAt: snapshot.holdExpiresAt,
        supportEmail: snapshot.supportEmail,
        manageUrl: snapshot.manageUrl,
      });
    case "BOOKING_CANCELLED":
      return bookingCancelledEmail({
        ...snapshot,
        cancelledAt: new Date().toISOString(),
        refundAmount: 0,
        refundStatus: snapshot.paymentStatus,
      });
    case "CHECKIN_REMINDER":
      return checkinReminderEmail(snapshot);
    case "CHECKED_IN":
      return checkedInEmail(snapshot);
    case "CHECKED_OUT":
      return checkedOutEmail(snapshot);
    case "ADMIN_NEW_BOOKING":
      return adminAlertEmail(
        {
          bookingReference: snapshot.bookingReference,
          headline: "New booking",
          detail: `${snapshot.guestName}, ${snapshot.roomSummary}, ${snapshot.checkIn} → ${snapshot.checkOut}.`,
          adminUrl: adminUrl(snapshot.bookingId),
        },
        "New booking",
      );
    case "ADMIN_PAYMENT_FAILURE":
      return adminAlertEmail(
        {
          bookingReference: snapshot.bookingReference,
          headline: "Payment failure",
          detail: `Payment for ${snapshot.guestName} failed. Booking is ${snapshot.paymentStatus}.`,
          adminUrl: adminUrl(snapshot.bookingId),
        },
        "Payment failure",
      );
    case "ADMIN_CANCELLATION":
      return adminAlertEmail(
        {
          bookingReference: snapshot.bookingReference,
          headline: "Booking cancelled",
          detail: `Cancelled by guest/admin. Payment state: ${snapshot.paymentStatus}.`,
          adminUrl: adminUrl(snapshot.bookingId),
        },
        "Booking cancelled",
      );
    default:
      return null;
  }
}

/**
 * Sends one due notification. REFUND_UPDATED loads its own context (refund
 * row, not booking snapshot). Returns true when a row was claimed.
 */
export async function processDueNotification(now: Date = new Date()): Promise<boolean> {
  const notification = await claimDueNotification(now);
  if (!notification) return false;
  try {
    const rendered = await renderNotification(notification);
    if (!rendered) {
      throw new Error(`No template for type ${notification.type}`);
    }
    const result = await getEmailProvider().send(notification.recipient, rendered);
    await markNotificationSent(notification.id, result.provider, result.providerMessageId);
    logger.info("Notification sent", { type: notification.type, to: notification.recipient });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const delay = nextRetryDelayMs(notification.attempts);
    if (delay === null || notification.attempts >= notification.maxAttempts) {
      await markNotificationFailed(notification.id, message.slice(0, 500));
      logger.error("Notification failed permanently", { id: notification.id, message });
    } else {
      await markNotificationRetry(
        notification.id,
        new Date(now.getTime() + delay),
        message.slice(0, 500),
      );
    }
  }
  return true;
}

async function renderNotification(notification: Notification): Promise<RenderedEmail | null> {
  if (notification.type === "REFUND_UPDATED") {
    if (!notification.paymentId) {
      throw new Error(
        `REFUND_UPDATED ${notification.id} carries no paymentId — re-enqueue with the refunded payment`,
      );
    }
    const refund = await findLatestRefundForPayment(notification.paymentId);
    if (!refund) {
      throw new Error(
        `Refund row not recorded yet for payment ${notification.paymentId} — retrying later`,
      );
    }
    const booking = notification.bookingId ? await findBookingById(notification.bookingId) : null;
    return refundUpdatedEmail({
      guestName: booking
        ? `${booking.contact.firstName} ${booking.contact.lastName}`.trim()
        : "Guest",
      bookingReference: booking?.bookingNumber ?? "—",
      currency: refund.currency,
      refundAmount: refund.amount,
      refundStatus: refund.status.toLowerCase(),
      supportEmail: env.EMAIL_REPLY_TO ?? env.EMAIL_FROM,
    });
  }
  if (!notification.bookingId) return null;
  const snapshot = await loadBookingEmailSnapshot(notification.bookingId);
  if (!snapshot) return null;
  return renderFor(notification, snapshot);
}

export async function listAdminNotifications(
  filter: ListNotificationsFilter,
): ReturnType<typeof listNotifications> {
  return listNotifications(filter);
}

/**
 * Admin alert fan-out (docs 06 §42). No-op when no admin recipient is
 * configured — customer mail never depends on it.
 */
export async function enqueueAdminAlert(input: {
  type: NotificationType;
  bookingId: string;
  idempotencyKey: string;
}): Promise<void> {
  const recipient = env.ADMIN_NOTIFICATION_EMAIL;
  if (!recipient) return;
  await enqueueNotification({ ...input, recipient });
}

/**
 * Check-in reminder sweep (docs 06 §41). Enqueues one reminder per
 * CONFIRMED booking checking in within the window, then marks it so the
 * idempotency key can never fire twice — even across restarts.
 */
export async function runReminderSweep(now: Date = new Date()): Promise<number> {
  const settings = await getSiteSettings().catch(() => null);
  const windowMs = (settings?.reminderHoursBefore ?? 24) * 3_600_000;
  const windowEnd = new Date(now.getTime() + windowMs);
  const due = await findBookingsForReminderSweep(windowEnd);
  let enqueued = 0;
  for (const booking of due) {
    if (new Date(booking.checkIn).getTime() <= now.getTime()) continue;
    const inserted = await enqueueNotification({
      type: "CHECKIN_REMINDER",
      recipient: booking.contact.email,
      bookingId: booking.id,
      idempotencyKey: notificationKeys.checkinReminder(booking.id, new Date(booking.checkIn)),
    });
    await markReminderSent(booking.id);
    if (inserted) enqueued += 1;
  }
  return enqueued;
}

export async function retryAdminNotification(id: string): Promise<Notification> {
  const existing = await findNotificationById(id);
  if (!existing) {
    throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
  }
  if (existing.status !== "FAILED") {
    throw new AppError("Only failed notifications can be retried", 400, "NOTIFICATION_NOT_RETRYABLE");
  }
  const requeued = await requeueNotification(id);
  if (!requeued) {
    throw new AppError("Notification not found", 404, "NOTIFICATION_NOT_FOUND");
  }
  return requeued;
}

export { MAX_ATTEMPTS };
