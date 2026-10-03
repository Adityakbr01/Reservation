import { AppError } from "../../utils/app-error";
import { isDuplicateKeyError } from "../../utils/mongo";
import { getStripe } from "../../integrations/stripe/stripe.client";
import { expireOverdueHolds, findBookingById, setBookingStatus } from "../bookings/booking.repository";
import { createPayment, findLatestPaymentForBooking, findPaymentById, toPayment } from "./payment.repository";
import type { Payment } from "./payment.types";

export interface PaymentIntentResult {
  payment: Payment;
  clientSecret: string;
  reused: boolean;
}

/**
 * Creates (or reuses) a Stripe PaymentIntent for a HELD booking.
 * Amount and currency always come from the server-side booking total —
 * client figures are never trusted. Moves the booking to PAYMENT_PENDING
 * so the hold visibly tracks the payment attempt. Retry-safe: an
 * incomplete intent for the same booking is returned, never duplicated.
 */
export async function createPaymentIntent(
  userId: string,
  bookingId: string,
): Promise<PaymentIntentResult> {
  await expireOverdueHolds();
  const booking = await findBookingById(bookingId);
  if (!booking || booking.userId !== userId) {
    throw new AppError("Booking not found", 404, "BOOKING_NOT_FOUND");
  }
  if (booking.status !== "HELD" && booking.status !== "PAYMENT_PENDING") {
    throw new AppError("This booking cannot be paid in its current state", 400, "BOOKING_NOT_PAYABLE");
  }
  if (booking.hold.expiresAt && booking.hold.expiresAt.getTime() <= Date.now()) {
    await expireOverdueHolds();
    throw new AppError("The hold expired — search again to rebook", 400, "HOLD_EXPIRED");
  }

  const existing = await findLatestPaymentForBooking(booking.id);
  if (
    existing &&
    (existing.status === "PENDING" || existing.status === "PROCESSING") &&
    existing.providerPaymentIntentId
  ) {
    const secret = await retrieveClientSecret(existing.providerPaymentIntentId);
    if (secret) {
      await setBookingStatus(booking.id, "PAYMENT_PENDING", { paymentStatus: "PENDING" });
      return { payment: existing, clientSecret: secret, reused: true };
    }
  }

  let intentId = "";
  let clientSecret: string | null = null;
  try {
    const intent = await getStripe().paymentIntents.create({
      amount: booking.pricing.total,
      currency: booking.pricing.currency.toLowerCase(),
      // Card-only, API-confirmed flow: no redirect UX exists in v1, so
      // redirect methods are disabled (avoids return_url requirements).
      automatic_payment_methods: { enabled: true, allow_redirects: "never" },
      metadata: {
        bookingId: booking.id,
        propertyId: booking.propertyId,
        environment: "test",
      },
    });
    intentId = intent.id;
    clientSecret = intent.client_secret;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AppError(`Payment provider unreachable: ${message}`, 502, "PAYMENT_PROVIDER_ERROR");
  }
  if (!clientSecret) {
    throw new AppError("Payment provider returned no client secret", 502, "PAYMENT_PROVIDER_ERROR");
  }

  try {
    const doc = await createPayment({
      bookingId: booking.id,
      userId,
      providerPaymentIntentId: intentId,
      amount: booking.pricing.total,
      currency: booking.pricing.currency,
      status: "PROCESSING",
      metadata: { bookingNumber: booking.bookingNumber },
    });
    await setBookingStatus(booking.id, "PAYMENT_PENDING", { paymentStatus: "PENDING" });
    return { payment: toPayment(doc), clientSecret, reused: false };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      const raced = await findLatestPaymentForBooking(booking.id);
      if (raced && raced.providerPaymentIntentId) {
        const secret = await retrieveClientSecret(raced.providerPaymentIntentId);
        if (secret) return { payment: raced, clientSecret: secret, reused: true };
      }
    }
    throw error;
  }
}

async function retrieveClientSecret(intentId: string): Promise<string | null> {
  try {
    const intent = await getStripe().paymentIntents.retrieve(intentId);
    return intent.client_secret;
  } catch {
    return null;
  }
}

export async function getPayment(id: string, userId: string): Promise<Payment> {
  const payment = await findPaymentById(id);
  if (!payment || payment.userId !== userId) {
    throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
  }
  return payment;
}
