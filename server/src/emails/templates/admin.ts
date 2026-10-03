import { escapeHtml, layout } from "../shared";
import type { RenderedEmail } from "../shared";

export interface AdminAlertContext {
  bookingReference: string;
  headline: string;
  detail: string;
  adminUrl: string;
}

export function adminAlertEmail(ctx: AdminAlertContext, subject: string): RenderedEmail {
  return {
    subject: `${subject} — ${ctx.bookingReference}`,
    html: layout(
      escapeHtml(ctx.headline),
      "team",
      `<p style="color: #2f2f2f;">Booking <strong>${escapeHtml(ctx.bookingReference)}</strong>: ${escapeHtml(ctx.detail)}</p>`,
      `Open in admin: ${escapeHtml(ctx.adminUrl)}`,
    ),
  };
}
