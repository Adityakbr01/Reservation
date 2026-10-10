/**
 * Notification queue contract (docs 06 §42, §46-§50).
 *
 * Queue rows carry routing only ({ type, bookingId, recipient,
 * idempotencyKey }); the worker loads fresh booking data at send time,
 * so a template always renders current state, never a stale snapshot.
 */
export const NOTIFICATION_TYPES = [
  "BOOKING_RECEIVED",
  "BOOKING_CONFIRMED",
  "PAYMENT_FAILED",
  "BOOKING_CANCELLED",
  "REFUND_UPDATED",
  "CHECKIN_REMINDER",
  "CHECKED_IN",
  "CHECKED_OUT",
  "ADMIN_NEW_BOOKING",
  "ADMIN_PAYMENT_FAILURE",
  "ADMIN_CANCELLATION",
  "ADMIN_SOLD_OUT",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_STATUSES = ["QUEUED", "PROCESSING", "SENT", "FAILED"] as const;

export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface Notification {
  id: string;
  type: NotificationType;
  recipient: string;
  bookingId: string | null;
  paymentId: string | null;
  idempotencyKey: string;
  status: NotificationStatus;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date | null;
  lastError: string | null;
  provider: string | null;
  providerMessageId: string | null;
  sentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Exponential backoff between attempts (docs 06 §74). Index = attempt number. */
export const RETRY_DELAYS_MS = [0, 60_000, 300_000, 900_000, 3_600_000] as const;

export const MAX_ATTEMPTS = RETRY_DELAYS_MS.length;

export function nextRetryDelayMs(attempt: number): number | null {
  if (attempt < 0 || attempt >= RETRY_DELAYS_MS.length) return null;
  return RETRY_DELAYS_MS[attempt];
}

/** Stable idempotency keys (docs 06 §49). Same event → same key → sent once. */
export function idempotencyKeyFor(
  type: NotificationType,
  ...parts: Array<string | number>
): string {
  return `${type}:${parts.join(":")}`;
}

function toDateKey(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export const notificationKeys = {
  bookingReceived: (bookingId: string) =>
    idempotencyKeyFor("BOOKING_RECEIVED", bookingId),
  bookingConfirmed: (bookingId: string) =>
    idempotencyKeyFor("BOOKING_CONFIRMED", bookingId),
  paymentFailed: (paymentIntentId: string, eventId: string) =>
    idempotencyKeyFor("PAYMENT_FAILED", paymentIntentId, eventId),
  bookingCancelled: (bookingId: string) =>
    idempotencyKeyFor("BOOKING_CANCELLED", bookingId),
  refundUpdated: (providerRefundId: string) =>
    idempotencyKeyFor("REFUND_UPDATED", providerRefundId),
  checkinReminder: (bookingId: string, checkIn: Date) =>
    idempotencyKeyFor("CHECKIN_REMINDER", bookingId, toDateKey(checkIn)),
  checkedIn: (bookingId: string) => idempotencyKeyFor("CHECKED_IN", bookingId),
  checkedOut: (bookingId: string) => idempotencyKeyFor("CHECKED_OUT", bookingId),
  adminNewBooking: (bookingId: string) =>
    idempotencyKeyFor("ADMIN_NEW_BOOKING", bookingId),
  adminPaymentFailure: (paymentIntentId: string, eventId: string) =>
    idempotencyKeyFor("ADMIN_PAYMENT_FAILURE", paymentIntentId, eventId),
  adminCancellation: (bookingId: string) =>
    idempotencyKeyFor("ADMIN_CANCELLATION", bookingId),
  soldOut: (checkIn: Date, checkOut: Date) =>
    idempotencyKeyFor("ADMIN_SOLD_OUT", toDateKey(checkIn), toDateKey(checkOut)),
};
