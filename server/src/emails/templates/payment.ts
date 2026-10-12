import {
  emailButton,
  escapeHtml,
  infoCard,
  layout,
  money,
  p,
  refPill,
} from "../shared";
import type { RenderedEmail } from "../shared";

export interface PaymentFailedContext {
  guestName: string;
  bookingReference: string;
  holdExpiresAt: string;
  supportEmail: string;
  manageUrl: string;
}

export function paymentFailedEmail(ctx: PaymentFailedContext): RenderedEmail {
  return {
    subject: `Payment failed — ${ctx.bookingReference}`,
    html: layout(
      "Payment did not go through",
      escapeHtml(ctx.guestName),
      p(
        `Your bank declined the charge for booking ${refPill(ctx.bookingReference)}. No money was captured.`,
      ) +
        infoCard(
          p(
            `You can <strong>retry</strong> while the hold is valid (until ${escapeHtml(ctx.holdExpiresAt)}).`,
          ),
        ) +
        emailButton(ctx.manageUrl, "Retry payment →"),
      `Retry from your bookings page: ${escapeHtml(ctx.manageUrl)} — or contact ${escapeHtml(ctx.supportEmail)}.`,
      { preheader: `Your payment for ${ctx.bookingReference} did not go through` },
    ),
    text: [
      `Hello ${ctx.guestName},`,
      ``,
      `Your bank declined the charge for booking ${ctx.bookingReference}. No money was captured.`,
      ``,
      `You can retry while the hold is valid (until ${ctx.holdExpiresAt}).`,
      ``,
      `Retry from your bookings page: ${ctx.manageUrl}`,
      `Or contact ${ctx.supportEmail}.`,
      ``,
      `Warm wishes,`,
      `The Hamptworth Stays Team`,
    ].join("\n"),
  };
}

export interface RefundUpdatedContext {
  guestName: string;
  bookingReference: string;
  currency: string;
  refundAmount: number;
  refundStatus: string;
  supportEmail: string;
}

export function refundUpdatedEmail(ctx: RefundUpdatedContext): RenderedEmail {
  return {
    subject: `Refund update — ${ctx.bookingReference}`,
    html: layout(
      "Refund update",
      escapeHtml(ctx.guestName),
      p(
        `Refund of <strong>${money(ctx.refundAmount, ctx.currency)}</strong> for booking ${refPill(ctx.bookingReference)} is now <strong>${escapeHtml(ctx.refundStatus)}</strong>.`,
      ),
      `Questions? Contact ${escapeHtml(ctx.supportEmail)}.`,
      { preheader: `Your refund for ${ctx.bookingReference} is ${ctx.refundStatus}` },
    ),
    text: [
      `Hello ${ctx.guestName},`,
      ``,
      `Refund of ${ctx.currency} ${(ctx.refundAmount / 100).toFixed(2)} for booking ${ctx.bookingReference} is now ${ctx.refundStatus}.`,
      ``,
      `Questions? Contact ${ctx.supportEmail}.`,
      ``,
      `Warm wishes,`,
      `The Hamptworth Stays Team`,
    ].join("\n"),
  };
}
