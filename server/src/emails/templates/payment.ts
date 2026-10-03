import { escapeHtml, layout, money } from "../shared";
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
      `<p style="color: #2f2f2f;">Your bank declined the charge for booking <strong>${escapeHtml(ctx.bookingReference)}</strong>. No money was captured. You can retry while the hold is valid (until ${escapeHtml(ctx.holdExpiresAt)}).</p>`,
      `Retry from your bookings page: ${escapeHtml(ctx.manageUrl)} — or contact ${escapeHtml(ctx.supportEmail)}.`,
    ),
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
      `<p style="color: #2f2f2f;">Refund of ${money(ctx.refundAmount, ctx.currency)} for booking <strong>${escapeHtml(ctx.bookingReference)}</strong> is now ${escapeHtml(ctx.refundStatus)}.</p>`,
      `Questions? Contact ${escapeHtml(ctx.supportEmail)}.`,
    ),
  };
}
