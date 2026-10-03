import type Stripe from "stripe";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { AppError } from "../../utils/app-error";
import { isDuplicateKeyError } from "../../utils/mongo";
import { getStripe } from "../../integrations/stripe/stripe.client";
import { setBookingStatus } from "../bookings/booking.repository";
import { findPaymentByIntentId, updatePaymentStatus } from "../payments/payment.repository";
import { recordRefund, sumSucceededRefunds } from "../refunds/refund.model";
import { findBookingById } from "../bookings/booking.repository";
import { releaseBookingHolds } from "../bookings/hold.store";
import { findBookingItems } from "../bookings/booking.repository";
import {
  hasWebhookEvent,
  markWebhookEvent,
  recordWebhookEvent,
} from "./webhook-event.model";

/**
 * Verifies the Stripe signature over the RAW body. Throws 400 on mismatch,
 * 503 when no secret is available (fail closed, loudly).
 * Async: Bun's SubtleCrypto cannot run the SDK's sync verifier.
 */
export async function verifyStripeWebhook(
  rawBody: Buffer,
  signature: string,
  secretOverride?: string,
): Promise<Stripe.Event> {
  const secret = secretOverride ?? env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new AppError("Stripe webhooks are not configured", 503, "STRIPE_WEBHOOK_NOT_CONFIGURED");
  }
  if (!signature) {
    throw new AppError("Missing webhook signature", 400, "INVALID_SIGNATURE");
  }
  try {
    return await getStripe().webhooks.constructEventAsync(rawBody, signature, secret);
  } catch {
    throw new AppError("Invalid webhook signature", 400, "INVALID_SIGNATURE");
  }
}

/**
 * Docs §28 pipeline: existence check → persist RECEIVED → process →
 * mark PROCESSED → return success. Duplicate deliveries (including races
 * on the unique index) return success with zero repeated side effects.
 */
export async function processStripeEvent(event: Stripe.Event): Promise<void> {
  if (await hasWebhookEvent(event.id)) {
    return;
  }
  try {
    await recordWebhookEvent(event.id, event.type);
  } catch (error) {
    if (isDuplicateKeyError(error)) return;
    throw error;
  }
  try {
    switch (event.type) {
      case "payment_intent.succeeded":
        await handleSucceeded(event);
        break;
      case "payment_intent.payment_failed":
        await handleFailed(event, false);
        break;
      case "payment_intent.canceled":
        await handleFailed(event, true);
        break;
      case "charge.refunded":
        await handleRefunded(event);
        break;
      default:
        break;
    }
    await markWebhookEvent(event.id, "PROCESSED");
  } catch (error) {
    await markWebhookEvent(event.id, "FAILED");
    throw error;
  }
}

async function handleSucceeded(event: Stripe.Event): Promise<void> {
  const intent = event.data.object as Stripe.PaymentIntent;
  const payment = await findPaymentByIntentId(intent.id);
  if (!payment) {
    // Unknown payment: flag for reconciliation, never invent records.
    logger.warn("Webhook for unknown payment intent", { intentId: intent.id });
    return;
  }
  if (payment.status === "PAID") return;
  if (intent.amount !== payment.amount || intent.currency.toUpperCase() !== payment.currency.toUpperCase()) {
    logger.error("Payment amount/currency mismatch", { intentId: intent.id });
    await updatePaymentStatus(payment.id, {
      status: "FAILED",
      failureCode: "AMOUNT_MISMATCH",
      failureMessage: "Charged amount does not match the booking total",
    });
    return;
  }
  await updatePaymentStatus(payment.id, { status: "PAID", paidAt: new Date() });
  const booking = await findBookingById(payment.bookingId);
  if (!booking) {
    logger.error("Paid booking record missing", { intentId: intent.id });
    return;
  }
  if (booking.status === "HELD" || booking.status === "PAYMENT_PENDING") {
    // Booking status and payment status stay in sync: CONFIRMED + PAID.
    await setBookingStatus(booking.id, "CONFIRMED", { paymentStatus: "PAID" });
    const items = await findBookingItems(booking.id);
    releaseBookingHolds(
      items.map((item) => item.roomId).filter((roomId): roomId is string => roomId !== null),
      booking.hold.holdId ?? "",
    );
  } else {
    // Money captured but booking left the payable window (cancelled/expired
    // meanwhile). Flag for ops review / refund — Phase 8 owns the action.
    logger.warn("Payment captured for non-payable booking", {
      intentId: intent.id,
      status: booking.status,
    });
  }
  // Email + audit hooks attach here (Phase 9 / Phase 12).
}

async function handleFailed(event: Stripe.Event, canceled: boolean): Promise<void> {
  const intent = event.data.object as Stripe.PaymentIntent;
  const payment = await findPaymentByIntentId(intent.id);
  if (!payment || payment.status === "PAID") return;
  const stripeError = (intent as { last_payment_error?: { code?: string; message?: string } })
    .last_payment_error;
  await updatePaymentStatus(payment.id, {
    status: "FAILED",
    failureCode: canceled ? "PAYMENT_CANCELED" : (stripeError?.code ?? "PAYMENT_FAILED"),
    failureMessage: (stripeError?.message ?? "The payment failed").slice(0, 300),
  });
  const failedBooking = await findBookingById(payment.bookingId);
  if (failedBooking) {
    await setBookingStatus(failedBooking.id, failedBooking.status, { paymentStatus: "FAILED" });
  }
  // Booking stays retryable while its hold is alive; the lazy-expiry sweep
  // transitions it to EXPIRED afterwards. Never confirmed on failure.
}

async function handleRefunded(event: Stripe.Event): Promise<void> {
  const charge = event.data.object as Stripe.Charge;
  const intentId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
  if (!intentId) {
    logger.warn("Refund event without payment intent reference");
    return;
  }
  const payment = await findPaymentByIntentId(intentId);
  if (!payment) {
    logger.warn("Refund for unknown payment intent", { intentId });
    return;
  }
  // Event payloads do not guarantee the refunds list is expanded, so the
  // authoritative list is fetched. Only succeeded refunds count.
  const stripe = getStripe();
  const list = await stripe.refunds.list({ payment_intent: intentId, limit: 10 });
  let changed = false;
  for (const refund of list.data) {
    if (refund.status !== "succeeded") continue;
    const recorded = await recordRefund({
      bookingId: payment.bookingId,
      paymentId: payment.id,
      providerRefundId: refund.id,
      amount: refund.amount,
      currency: (refund.currency ?? payment.currency).toUpperCase(),
      status: "SUCCEEDED",
      processedAt: new Date(),
    });
    if (recorded) changed = true;
  }
  if (!changed) return;
  const refundedSoFar = await sumSucceededRefunds(payment.id);
  const refundStatus = refundedSoFar >= payment.amount ? "REFUNDED" : "PARTIALLY_REFUNDED";
  await updatePaymentStatus(payment.id, { status: refundStatus });
  const refundedBooking = await findBookingById(payment.bookingId);
  if (refundedBooking) {
    // A fully refunded REFUND_PENDING booking completes its cancellation.
    // Anything else keeps its status; only the payment state changes.
    if (refundStatus === "REFUNDED" && refundedBooking.status === "REFUND_PENDING") {
      await setBookingStatus(refundedBooking.id, "CANCELLED", { paymentStatus: refundStatus });
    } else {
      await setBookingStatus(refundedBooking.id, refundedBooking.status, { paymentStatus: refundStatus });
    }
  }
}
