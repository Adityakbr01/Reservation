import { escapeHtml, layout, money } from "../shared";
import type { RenderedEmail } from "../shared";

export interface BookingEmailContext {
  guestName: string;
  bookingReference: string;
  propertyName: string;
  roomSummary: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: string;
  currency: string;
  subtotal: number;
  discount: number;
  taxes: number;
  fees: number;
  total: number;
  totalPaid: number;
  paymentStatus: string;
  cancellationPolicy: string;
  supportEmail: string;
  manageUrl: string;
}

function summaryRows(ctx: BookingEmailContext): string {
  return `<table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #2f2f2f;">
    <tr><td>Booking reference</td><td style="text-align: right;"><strong>${escapeHtml(ctx.bookingReference)}</strong></td></tr>
    <tr><td>Property</td><td style="text-align: right;">${escapeHtml(ctx.propertyName)}</td></tr>
    <tr><td>Rooms</td><td style="text-align: right;">${escapeHtml(ctx.roomSummary)}</td></tr>
    <tr><td>Check-in</td><td style="text-align: right;">${escapeHtml(ctx.checkIn)}</td></tr>
    <tr><td>Check-out</td><td style="text-align: right;">${escapeHtml(ctx.checkOut)}</td></tr>
    <tr><td>Nights / guests</td><td style="text-align: right;">${ctx.nights} / ${escapeHtml(ctx.guests)}</td></tr>
    <tr><td>Subtotal</td><td style="text-align: right;">${money(ctx.subtotal, ctx.currency)}</td></tr>
    <tr><td>Discount</td><td style="text-align: right;">${money(ctx.discount, ctx.currency)}</td></tr>
    <tr><td>Taxes &amp; fees</td><td style="text-align: right;">${money(ctx.taxes + ctx.fees, ctx.currency)}</td></tr>
    <tr><td><strong>Total</strong></td><td style="text-align: right;"><strong>${money(ctx.total, ctx.currency)}</strong></td></tr>
    <tr><td>Total paid</td><td style="text-align: right;">${money(ctx.totalPaid, ctx.currency)} (${escapeHtml(ctx.paymentStatus)})</td></tr>
  </table>`;
}

export function bookingReceivedEmail(ctx: BookingEmailContext): RenderedEmail {
  return {
    subject: `Booking received — ${ctx.bookingReference}`,
    html: layout(
      "Booking received",
      escapeHtml(ctx.guestName),
      `<p style="color: #2f2f2f;">We are holding your rooms while payment completes. Finish payment before the hold expires or the booking is released automatically.</p>${summaryRows(ctx)}`,
      `Manage your booking: ${escapeHtml(ctx.manageUrl)}`,
    ),
  };
}

export function bookingConfirmedEmail(ctx: BookingEmailContext): RenderedEmail {
  return {
    subject: `Booking confirmed — ${ctx.bookingReference}`,
    html: layout(
      "Booking confirmed",
      escapeHtml(ctx.guestName),
      `<p style="color: #2f2f2f;">Your payment is confirmed. Show this reference at check-in.</p>${summaryRows(ctx)}<p style="color: #2f2f2f;">Cancellation policy: ${escapeHtml(ctx.cancellationPolicy)}</p>`,
      `Questions? Reply to ${escapeHtml(ctx.supportEmail)}. Manage: ${escapeHtml(ctx.manageUrl)}`,
    ),
  };
}

export interface CancellationEmailContext extends BookingEmailContext {
  cancelledAt: string;
  refundAmount: number;
  refundStatus: string;
}

export function bookingCancelledEmail(ctx: CancellationEmailContext): RenderedEmail {
  const refundLine =
    ctx.refundAmount > 0
      ? `<p style="color: #2f2f2f;">Refund of ${money(ctx.refundAmount, ctx.currency)} is ${escapeHtml(ctx.refundStatus)}. It reaches the original payment method in 5–10 business days.</p>`
      : `<p style="color: #2f2f2f;">No refund was due for this cancellation.</p>`;
  return {
    subject: `Booking cancelled — ${ctx.bookingReference}`,
    html: layout(
      "Booking cancelled",
      escapeHtml(ctx.guestName),
      `<p style="color: #2f2f2f;">Booking <strong>${escapeHtml(ctx.bookingReference)}</strong> (${escapeHtml(ctx.checkIn)} → ${escapeHtml(ctx.checkOut)}) was cancelled on ${escapeHtml(ctx.cancelledAt)}.</p>${refundLine}`,
      `Questions? Contact ${escapeHtml(ctx.supportEmail)}.`,
    ),
  };
}

export function checkedInEmail(ctx: BookingEmailContext): RenderedEmail {
  return {
    subject: `Checked in — ${ctx.bookingReference}`,
    html: layout(
      "Welcome",
      escapeHtml(ctx.guestName),
      `<p style="color: #2f2f2f;">You are checked in at ${escapeHtml(ctx.propertyName)}. Booking <strong>${escapeHtml(ctx.bookingReference)}</strong>, rooms: ${escapeHtml(ctx.roomSummary)}. Enjoy your stay.</p>`,
      `Questions? Contact ${escapeHtml(ctx.supportEmail)}.`,
    ),
  };
}

export function checkedOutEmail(ctx: BookingEmailContext): RenderedEmail {
  return {
    subject: `Checked out — ${ctx.bookingReference}`,
    html: layout(
      "Thanks for staying",
      escapeHtml(ctx.guestName),
      `<p style="color: #2f2f2f;">You are checked out of ${escapeHtml(ctx.propertyName)}. Booking <strong>${escapeHtml(ctx.bookingReference)}</strong> total was ${money(ctx.total, ctx.currency)} (${escapeHtml(ctx.paymentStatus)}). We hope to host you again.</p>`,
      `Questions about charges? Contact ${escapeHtml(ctx.supportEmail)}.`,
    ),
  };
}

export function checkinReminderEmail(ctx: BookingEmailContext): RenderedEmail {
  return {
    subject: `Check-in tomorrow — ${ctx.bookingReference}`,
    html: layout(
      "See you tomorrow",
      escapeHtml(ctx.guestName),
      `<p style="color: #2f2f2f;">Reminder: check-in for booking <strong>${escapeHtml(ctx.bookingReference)}</strong> at ${escapeHtml(ctx.propertyName)} is ${escapeHtml(ctx.checkIn)}. Rooms: ${escapeHtml(ctx.roomSummary)}.</p>`,
      `Manage your booking: ${escapeHtml(ctx.manageUrl)} — or contact ${escapeHtml(ctx.supportEmail)}.`,
    ),
  };
}
