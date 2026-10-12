import { emailButton, escapeHtml, infoCard, layout, p, refPill, safeSubjectText } from "../shared";
import type { RenderedEmail } from "../shared";

export interface AdminAlertContext {
  bookingReference: string;
  headline: string;
  detail: string;
  adminUrl: string;
}

export function adminAlertEmail(ctx: AdminAlertContext, subject: string): RenderedEmail {
  return {
    subject: safeSubjectText(`${subject} — ${ctx.bookingReference}`),
    html: layout(
      escapeHtml(ctx.headline),
      "team",
      p(`Booking ${refPill(ctx.bookingReference)}`) +
        infoCard(p(escapeHtml(ctx.detail))) +
        emailButton(ctx.adminUrl, "Open in admin →"),
      `Open in admin: ${escapeHtml(ctx.adminUrl)}`,
      { preheader: `${ctx.headline}: ${ctx.bookingReference}` },
    ),
    text: [
      `Hello team,`,
      ``,
      `${ctx.headline}`,
      `Booking ${ctx.bookingReference}: ${ctx.detail}`,
      ``,
      `Open in admin: ${ctx.adminUrl}`,
    ].join("\n"),
  };
}
