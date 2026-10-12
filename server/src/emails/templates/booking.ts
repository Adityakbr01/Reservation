import {
  EMAIL_THEME,
  brandLinks,
  checkInLabel,
  checkOutLabel,
  emailButton,
  escapeHtml,
  heroCard,
  infoCard,
  infoRow,
  layout,
  mapsDirectionsUrl,
  money,
  p,
  refPill,
  safeSubjectText,
  sectionTitle,
  textLinks,
} from "../shared";
import type { BrandLinks, RenderedEmail } from "../shared";

export interface BookingEmailContext {
  guestName: string;
  bookingReference: string;
  /** Brand / property name, e.g. "Hamptworth Stays". */
  propertyName: string;
  /** Cottage name(s), e.g. "Fern Cottage" — never hardcoded in templates. */
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
  /** Raw times from property/settings, e.g. "16:00" / "11:00". Rendered as "After 4 pm". */
  checkInTime?: string | null;
  checkOutTime?: string | null;
  /** Full address, e.g. "Home Farm, Hamptworth, SP5 2DS". */
  propertyAddress?: string | null;
  /** Prebuilt directions link; falls back to one built from propertyAddress. */
  mapsUrl?: string | null;
  brandName?: string | null;
  brandSiteUrl?: string | null;
  bookingSiteUrl?: string | null;
}

function linksFor(ctx: BookingEmailContext): BrandLinks {
  return brandLinks({
    brandName: ctx.brandName?.trim() || ctx.propertyName,
    ...(ctx.brandSiteUrl ? { brandSiteUrl: ctx.brandSiteUrl } : {}),
    ...(ctx.bookingSiteUrl ? { bookingSiteUrl: ctx.bookingSiteUrl } : {}),
  });
}

function brandNameFor(ctx: BookingEmailContext): string {
  return linksFor(ctx).brandName;
}

function totalText(ctx: BookingEmailContext): string {
  return `${ctx.currency} ${(ctx.total / 100).toFixed(2)}`;
}

function arrivalCard(ctx: BookingEmailContext): string {
  return (
    sectionTitle("Your arrival") +
    infoCard(
      infoRow("Check-in", escapeHtml(checkInLabel(ctx.checkInTime))) +
        infoRow("Check-out", escapeHtml(checkOutLabel(ctx.checkOutTime))),
    )
  );
}

function findingUsCard(ctx: BookingEmailContext): string {
  const address = ctx.propertyAddress?.trim();
  const mapsUrl = ctx.mapsUrl?.trim() || mapsDirectionsUrl(address);
  if (!address && !mapsUrl) return "";
  const addressLine = address
    ? `<p style="margin: 0 0 6px 0; font-family: Arial,Helvetica,sans-serif; font-size: 15px; color: ${EMAIL_THEME.ink};">${escapeHtml(address)}</p>`
    : "";
  const mapsLine = mapsUrl
    ? `<a href="${escapeHtml(mapsUrl)}" style="font-family: Arial,Helvetica,sans-serif; font-size: 14px; font-weight: 600; color: ${EMAIL_THEME.forest}; text-decoration: underline; text-underline-offset: 3px;">Get directions on Google Maps →</a>`
    : "";
  return sectionTitle("Finding us") + infoCard(`${addressLine}${mapsLine}`);
}

function stayCard(ctx: BookingEmailContext): string {
  const detailLine =
    `${escapeHtml(ctx.checkIn)} &nbsp;→&nbsp; ${escapeHtml(ctx.checkOut)}<br />${ctx.nights} night${ctx.nights === 1 ? "" : "s"} · ${escapeHtml(ctx.guests)}`;
  return heroCard(ctx.bookingReference, ctx.roomSummary, detailLine);
}

function websitesBlock(ctx: BookingEmailContext): string {
  const links = linksFor(ctx);
  return (
    sectionTitle("Our websites") +
    textLinks([
      { url: links.brandSiteUrl, label: `Explore ${links.brandName} →` },
      { url: links.bookingSiteUrl, label: `Visit our booking website →` },
    ])
  );
}

function footerLine(ctx: BookingEmailContext): string {
  return `Questions? Reply to ${escapeHtml(ctx.supportEmail)}. Manage: ${escapeHtml(ctx.manageUrl)}`;
}

function websitesText(links: BrandLinks): string {
  return `Explore ${links.brandName}: ${links.brandSiteUrl}\nPlan your stay: ${links.bookingSiteUrl}`;
}

function luxurySummaryTable(ctx: BookingEmailContext): string {
  const row = (label: string, value: string) =>
    `<tr><td style="font-family: Arial,Helvetica,sans-serif; font-size: 13.5px; color: ${EMAIL_THEME.muted}; padding: 9px 0; border-bottom: 1px solid ${EMAIL_THEME.ivoryDeep};">${label}</td><td align="right" style="font-family: Arial,Helvetica,sans-serif; font-size: 13.5px; font-weight: 600; color: ${EMAIL_THEME.body}; padding: 9px 0; border-bottom: 1px solid ${EMAIL_THEME.ivoryDeep};">${value}</td></tr>`;
  return (
    sectionTitle("Booking summary") +
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 10px 0; background-color: #ffffff; border: 1px solid ${EMAIL_THEME.border}; border-radius: 4px;"><tr><td style="padding: 10px 22px 6px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">` +
      row("Booking reference", `<strong>${escapeHtml(ctx.bookingReference)}</strong>`) +
      row("Cottage", escapeHtml(ctx.roomSummary)) +
      row("Check-in", escapeHtml(ctx.checkIn)) +
      row("Check-out", escapeHtml(ctx.checkOut)) +
      row("Nights / guests", `${ctx.nights} / ${escapeHtml(ctx.guests)}`) +
      row("Subtotal", money(ctx.subtotal, ctx.currency)) +
      row("Discount", money(ctx.discount, ctx.currency)) +
      row("Taxes &amp; fees", money(ctx.taxes + ctx.fees, ctx.currency)) +
      `</table></td></tr><tr><td style="background-color: ${EMAIL_THEME.ivory}; border-top: 2px solid ${EMAIL_THEME.gold}; border-radius: 0 0 3px 3px; padding: 14px 22px;"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="font-family: Arial,Helvetica,sans-serif; font-size: 12px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${EMAIL_THEME.bronze};">Total</td><td align="right" style="font-family: Georgia,'Times New Roman',serif; font-size: 24px; font-weight: 700; color: ${EMAIL_THEME.forest};">${money(ctx.total, ctx.currency)}</td></tr>` +
      `<tr><td colspan="2" style="font-family: Arial,Helvetica,sans-serif; font-size: 12.5px; color: ${EMAIL_THEME.muted}; padding-top: 4px;">Total paid: ${money(ctx.totalPaid, ctx.currency)} (${escapeHtml(ctx.paymentStatus)})</td></tr>` +
      `</table></td></tr></table>`
  );
}

function summaryText(ctx: BookingEmailContext): string {
  return [
    `Booking reference: ${ctx.bookingReference}`,
    `Cottage: ${ctx.roomSummary}`,
    `Check-in: ${ctx.checkIn}`,
    `Check-out: ${ctx.checkOut}`,
    `Nights / guests: ${ctx.nights} / ${ctx.guests}`,
    `Total: ${totalText(ctx)}`,
    `Total paid: ${ctx.currency} ${(ctx.totalPaid / 100).toFixed(2)} (${ctx.paymentStatus})`,
  ].join("\n");
}

export function bookingReceivedEmail(ctx: BookingEmailContext): RenderedEmail {
  const brand = brandNameFor(ctx);
  const links = linksFor(ctx);
  return {
    subject: `Booking received — ${ctx.bookingReference}`,
    html: layout(
      "Booking received",
      escapeHtml(ctx.guestName),
      p(
        `Thank you for choosing <strong>${escapeHtml(ctx.roomSummary)}</strong> with <strong>${escapeHtml(brand)}</strong>. We are holding your rooms while payment completes — please finish payment before the hold expires, or the booking is released automatically.`,
      ) +
        stayCard(ctx) +
        luxurySummaryTable(ctx) +
        emailButton(ctx.manageUrl, "Complete payment →"),
      footerLine(ctx),
      { preheader: `We're holding ${ctx.roomSummary} while your payment completes` },
    ),
    text: [
      `Hello ${ctx.guestName},`,
      ``,
      `Thank you for choosing ${ctx.roomSummary} with ${brand}. We are holding your rooms while payment completes — please finish payment before the hold expires, or the booking is released automatically.`,
      ``,
      summaryText(ctx),
      ``,
      `Complete payment: ${ctx.manageUrl}`,
      ``,
      websitesText(links),
      ``,
      `Warm wishes,`,
      `The ${brand} Team`,
    ].join("\n"),
  };
}

export function bookingConfirmedEmail(ctx: BookingEmailContext): RenderedEmail {
  const links = linksFor(ctx);
  const brand = links.brandName;
  const address = ctx.propertyAddress?.trim();
  const mapsUrl = ctx.mapsUrl?.trim() || mapsDirectionsUrl(address);
  return {
    subject: `Booking confirmed — ${ctx.bookingReference}`,
    html: layout(
      "Booking confirmed",
      escapeHtml(ctx.guestName),
      p(
        `Thank you for booking <strong>${escapeHtml(ctx.roomSummary)}</strong> with <strong>${escapeHtml(brand)}</strong>. We’re delighted you’ll be joining us for a countryside escape.`,
      ) +
        p(`Look forward to slower mornings, fresh air and a few days at your own pace.`) +
        stayCard(ctx) +
        arrivalCard(ctx) +
        findingUsCard(ctx) +
        p(
          `Please keep your booking reference handy. For any questions before your stay, get in touch through our booking website below.`,
        ) +
        websitesBlock(ctx) +
        emailButton(ctx.manageUrl, "Manage your booking →") +
        p(
          `<span style="font-size: 13px; color: ${EMAIL_THEME.muted};">Cancellation policy: ${escapeHtml(ctx.cancellationPolicy)}</span>`,
        ),
      footerLine(ctx),
      { preheader: `Your stay at ${ctx.roomSummary} is confirmed` },
    ),
    text: [
      `Hello ${ctx.guestName},`,
      ``,
      `Thank you for booking ${ctx.roomSummary} with ${brand}. We're delighted you'll be joining us for a countryside escape.`,
      ``,
      `Look forward to slower mornings, fresh air and a few days at your own pace.`,
      ``,
      `Your arrival`,
      `Check-in: ${checkInLabel(ctx.checkInTime)}`,
      `Check-out: ${checkOutLabel(ctx.checkOutTime)}`,
      ``,
      address ? `Finding us\n${address}\n${mapsUrl ?? ""}` : ``,
      ``,
      summaryText(ctx),
      ``,
      `Please keep your booking reference handy. For any questions before your stay, get in touch through our booking website below.`,
      ``,
      websitesText(links),
      ``,
      `Manage your booking: ${ctx.manageUrl}`,
      ``,
      `Cancellation policy: ${ctx.cancellationPolicy}`,
      ``,
      `Warm wishes,`,
      `The ${brand} Team`,
    ].join("\n"),
  };
}

export interface CancellationEmailContext extends BookingEmailContext {
  cancelledAt: string;
  refundAmount: number;
  refundStatus: string;
}

export function bookingCancelledEmail(ctx: CancellationEmailContext): RenderedEmail {
  const brand = brandNameFor(ctx);
  const refundHtml =
    ctx.refundAmount > 0
      ? p(
          `Refund of <strong>${money(ctx.refundAmount, ctx.currency)}</strong> is ${escapeHtml(ctx.refundStatus)}. It reaches the original payment method in 5–10 business days.`,
        )
      : p(`No refund was due for this cancellation.`);
  const refundText =
    ctx.refundAmount > 0
      ? `Refund of ${ctx.currency} ${(ctx.refundAmount / 100).toFixed(2)} is ${ctx.refundStatus}. It reaches the original payment method in 5–10 business days.`
      : `No refund was due for this cancellation.`;
  return {
    subject: `Booking cancelled — ${ctx.bookingReference}`,
    html: layout(
      "Booking cancelled",
      escapeHtml(ctx.guestName),
      p(
        `Booking ${refPill(ctx.bookingReference)}<br /><span style="font-size: 14px;">${escapeHtml(ctx.checkIn)} → ${escapeHtml(ctx.checkOut)} · cancelled on ${escapeHtml(ctx.cancelledAt)}.</span>`,
      ) + refundHtml,
      `Questions? Contact ${escapeHtml(ctx.supportEmail)}.`,
      { preheader: `Your booking ${ctx.bookingReference} was cancelled` },
    ),
    text: [
      `Hello ${ctx.guestName},`,
      ``,
      `Booking ${ctx.bookingReference} (${ctx.checkIn} → ${ctx.checkOut}) was cancelled on ${ctx.cancelledAt}.`,
      refundText,
      ``,
      `Questions? Contact ${ctx.supportEmail}.`,
      ``,
      `Warm wishes,`,
      `The ${brand} Team`,
    ].join("\n"),
  };
}

export function checkedInEmail(ctx: BookingEmailContext): RenderedEmail {
  const links = linksFor(ctx);
  return {
    subject: safeSubjectText(`Welcome to ${ctx.roomSummary} — ${ctx.bookingReference}`),
    html: layout(
      `Welcome to ${escapeHtml(ctx.roomSummary)}`,
      escapeHtml(ctx.guestName),
      p(
        `Welcome to <strong>${escapeHtml(ctx.roomSummary)}</strong>. We’re delighted to have you here at <strong>${escapeHtml(links.brandName)}</strong>.`,
      ) +
        p(
          `Unpack, settle in and make the most of your countryside days. Whether you’re heading out to explore or enjoying a quiet morning, we hope you feel at home.`,
        ) +
        infoCard(
          `<p style="margin: 0 0 8px 0;">${refPill(ctx.bookingReference)}</p>` +
            `<p style="margin: 6px 0 0 0; font-family: Arial,Helvetica,sans-serif; font-size: 14px; line-height: 1.7; color: ${EMAIL_THEME.body};">If you need anything during your stay, please get in touch through our booking website below.</p>`,
        ) +
        p(
          `<strong>A little reminder:</strong> Check-out is before <strong>${escapeHtml(checkOutLabel(ctx.checkOutTime))}</strong> on your departure day (${escapeHtml(ctx.checkOut)}).`,
        ) +
        textLinks([
          { url: links.brandSiteUrl, label: `Explore ${links.brandName} →` },
          { url: links.bookingSiteUrl, label: `Booking website &amp; enquiries →` },
        ]),
      `Questions? Contact ${escapeHtml(ctx.supportEmail)}.`,
      { preheader: `Welcome to ${ctx.roomSummary}` },
    ),
    text: [
      `Hello ${ctx.guestName},`,
      ``,
      `Welcome to ${ctx.roomSummary}. We're delighted to have you here at ${links.brandName}.`,
      ``,
      `Unpack, settle in and make the most of your countryside days. Whether you're heading out to explore or enjoying a quiet morning, we hope you feel at home.`,
      ``,
      `Booking reference: ${ctx.bookingReference}. If you need anything during your stay, please get in touch through our booking website below.`,
      ``,
      `A little reminder: Check-out is before ${checkOutLabel(ctx.checkOutTime)} on your departure day (${ctx.checkOut}).`,
      ``,
      websitesText(links),
      ``,
      `Warm wishes,`,
      `The ${links.brandName} Team`,
    ].join("\n"),
  };
}

export function checkedOutEmail(ctx: BookingEmailContext): RenderedEmail {
  const links = linksFor(ctx);
  return {
    subject: safeSubjectText(`Thank You for Staying at ${ctx.roomSummary}`),
    html: layout(
      `Thank you for staying at ${escapeHtml(ctx.roomSummary)}`,
      escapeHtml(ctx.guestName),
      p(
        `Thank you for choosing <strong>${escapeHtml(ctx.roomSummary)}</strong> by <strong>${escapeHtml(links.brandName)}</strong>.`,
      ) +
        p(
          `We hope you enjoyed your countryside escape and created some wonderful memories during your stay.`,
        ) +
        infoCard(
          `<p style="margin: 0 0 8px 0;">${refPill(ctx.bookingReference)}</p>` +
            `<p style="margin: 6px 0 0 0; font-family: Georgia,'Times New Roman',serif; font-size: 18px; font-weight: 700; color: ${EMAIL_THEME.forest};">${money(ctx.total, ctx.currency)} <span style="font-family: Arial,Helvetica,sans-serif; font-size: 12.5px; font-weight: 400; color: ${EMAIL_THEME.muted};">(${escapeHtml(ctx.paymentStatus)})</span></p>` +
            `<p style="margin: 8px 0 0 0; font-family: Arial,Helvetica,sans-serif; font-size: 14px; line-height: 1.7; color: ${EMAIL_THEME.body};">We’d love to hear about your experience. If you have any feedback, please get in touch through our booking website.</p>`,
        ) +
        p(`We wish you a safe onward journey and would be delighted to welcome you back.`) +
        textLinks([
          { url: links.brandSiteUrl, label: `Explore ${links.brandName} →` },
          { url: links.bookingSiteUrl, label: `Plan Your Next Stay →` },
        ]),
      `Questions about charges? Contact ${escapeHtml(ctx.supportEmail)}.`,
      { preheader: `Thank you for staying at ${ctx.roomSummary}` },
    ),
    text: [
      `Hello ${ctx.guestName},`,
      ``,
      `Thank you for choosing ${ctx.roomSummary} by ${links.brandName}.`,
      ``,
      `We hope you enjoyed your countryside escape and created some wonderful memories during your stay.`,
      ``,
      `Booking reference: ${ctx.bookingReference}. Total: ${totalText(ctx)} (${ctx.paymentStatus}).`,
      ``,
      `We'd love to hear about your experience. If you have any feedback, please get in touch through our booking website.`,
      ``,
      `We wish you a safe onward journey and would be delighted to welcome you back.`,
      ``,
      `Explore ${links.brandName}: ${links.brandSiteUrl}`,
      `Plan Your Next Stay: ${links.bookingSiteUrl}`,
      ``,
      `Warm wishes,`,
      `The ${links.brandName} Team`,
    ].join("\n"),
  };
}

export function checkinReminderEmail(ctx: BookingEmailContext): RenderedEmail {
  const links = linksFor(ctx);
  const brand = links.brandName;
  const address = ctx.propertyAddress?.trim();
  const mapsUrl = ctx.mapsUrl?.trim() || mapsDirectionsUrl(address);
  return {
    subject: `Check-in tomorrow — ${ctx.bookingReference}`,
    html: layout(
      "See you tomorrow",
      escapeHtml(ctx.guestName),
      p(
        `A gentle reminder — check-in for booking ${refPill(ctx.bookingReference)} at ${escapeHtml(brand)} is <strong>${escapeHtml(ctx.checkIn)}</strong>. Rooms: ${escapeHtml(ctx.roomSummary)}.`,
      ) +
        arrivalCard(ctx) +
        findingUsCard(ctx) +
        stayCard(ctx) +
        emailButton(ctx.manageUrl, "Manage your booking →"),
      `Manage your booking: ${escapeHtml(ctx.manageUrl)} — or contact ${escapeHtml(ctx.supportEmail)}.`,
      { preheader: `Check-in tomorrow at ${ctx.roomSummary}` },
    ),
    text: [
      `Hello ${ctx.guestName},`,
      ``,
      `A gentle reminder — check-in for booking ${ctx.bookingReference} at ${brand} is ${ctx.checkIn}. Rooms: ${ctx.roomSummary}.`,
      ``,
      `Your arrival`,
      `Check-in: ${checkInLabel(ctx.checkInTime)}`,
      `Check-out: ${checkOutLabel(ctx.checkOutTime)}`,
      ...(address ? [``, `Finding us`, address, mapsUrl ?? ``] : []),
      ``,
      summaryText(ctx),
      ``,
      `Manage your booking: ${ctx.manageUrl}`,
      ``,
      `Warm wishes,`,
      `The ${brand} Team`,
    ].join("\n"),
  };
}
