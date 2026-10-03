import { AppError } from "../../utils/app-error";
import { isDuplicateKeyError } from "../../utils/mongo";
import { getStripe } from "../../integrations/stripe/stripe.client";
import { expireOverdueHolds, findBookingById, setBookingStatus } from "../bookings/booking.repository";
import { createPayment, findLatestPaymentForBooking, findPaymentById, listPayments, toPayment } from "./payment.repository";
import { listRefundsForPayment } from "../refunds/refund.model";
import type { ListPaymentsFilter } from "./payment.repository";
import type { Payment } from "./payment.types";
import type { Paginated } from "../../utils/pagination";

export async function listAllPayments(filter: ListPaymentsFilter): Promise<Paginated<Payment>> {
  return listPayments(filter);
}

export interface AdminPaymentDetail {
  payment: Payment;
  bookingNumber: string | null;
  refunds: Array<{
    id: string;
    providerRefundId: string;
    amount: number;
    currency: string;
    status: string;
    processedAt: Date | null;
  }>;
}

/** Deep payment view (docs 07 §48): booking ref, Stripe PI id, refunds — no secrets. */
export async function getPaymentAdmin(id: string): Promise<AdminPaymentDetail> {
  const payment = await findPaymentById(id);
  if (!payment) {
    throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
  }
  const [booking, refunds] = await Promise.all([
    findBookingById(payment.bookingId),
    listRefundsForPayment(payment.id),
  ]);
  return {
    payment,
    bookingNumber: booking?.bookingNumber ?? null,
    refunds: refunds.map((refund) => ({
      id: refund.id,
      providerRefundId: refund.providerRefundId,
      amount: refund.amount,
      currency: refund.currency,
      status: refund.status,
      processedAt: refund.processedAt,
    })),
  };
}
import { recordRefund, sumSucceededRefunds } from "../refunds/refund.model";
import type { Refund } from "../refunds/refund.model";

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

export interface RefundPaymentResult {
  refund: Refund;
}

/**
 * Admin-initiated Stripe refund against captured funds. Amount defaults to
 * the remaining refundable balance. Webhook delivery finalizes payment
 * states; this call only starts the refund at the provider.
 */
export async function refundPayment(
  paymentId: string,
  amount: number | null,
  requestedBy: string | null,
): Promise<RefundPaymentResult> {
  const payment = await findPaymentById(paymentId);
  if (!payment) {
    throw new AppError("Payment not found", 404, "PAYMENT_NOT_FOUND");
  }
  if (payment.status !== "PAID" && payment.status !== "PARTIALLY_REFUNDED") {
    throw new AppError("Only captured payments can be refunded", 400, "PAYMENT_NOT_REFUNDABLE");
  }
  if (!payment.providerPaymentIntentId) {
    throw new AppError("Payment has no provider reference", 400, "PAYMENT_NOT_REFUNDABLE");
  }
  const alreadyRefunded = await sumSucceededRefunds(payment.id);
  const remaining = payment.amount - alreadyRefunded;
  if (remaining <= 0) {
    throw new AppError("Nothing left to refund on this payment", 400, "NOTHING_TO_REFUND");
  }
  const refundAmount = amount ?? remaining;
  if (!Number.isInteger(refundAmount) || refundAmount <= 0 || refundAmount > remaining) {
    throw new AppError("Refund amount exceeds the refundable balance", 400, "REFUND_EXCEEDS_CAPTURED");
  }
  let stripeRefund;
  try {
    stripeRefund = await getStripe().refunds.create({
      payment_intent: payment.providerPaymentIntentId,
      amount: refundAmount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AppError(`Refund failed at provider: ${message}`, 502, "REFUND_PROVIDER_ERROR");
  }
  const recorded = await recordRefund({
    bookingId: payment.bookingId,
    paymentId: payment.id,
    providerRefundId: stripeRefund.id,
    amount: stripeRefund.amount,
    currency: (stripeRefund.currency ?? payment.currency).toUpperCase(),
    status: stripeRefund.status === "succeeded" ? "SUCCEEDED" : "PENDING",
    requestedBy,
    processedAt: stripeRefund.status === "succeeded" ? new Date() : null,
  });
  if (!recorded) {
    throw new AppError("Refund was already recorded", 409, "REFUND_DUPLICATE");
  }
  return { refund: recorded };
}
