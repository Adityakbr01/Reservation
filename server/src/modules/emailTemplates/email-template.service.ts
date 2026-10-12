import { logger } from "../../config/logger";
import { AppError } from "../../utils/app-error";
import { sanitizeEmailHtml } from "../../emails/shared";
import {
  dummyBookingContext,
  dummyStringVars,
  templateDefinition,
  EMAIL_TEMPLATE_KEYS,
} from "../../emails/registry";
import type { EmailTemplateKey } from "../../emails/registry";
import {
  checkInLabel,
  checkOutLabel,
  extractPlaceholders,
  htmlToText,
  mapsDirectionsUrl,
  money,
  renderPlaceholderTemplate,
} from "../../emails/shared";
import type { RenderedEmail } from "../../emails/shared";
import { adminAlertEmail } from "../../emails/templates/admin";
import { passwordChangedEmail, passwordResetEmail } from "../../emails/templates/auth";
import {
  bookingCancelledEmail,
  bookingConfirmedEmail,
  bookingReceivedEmail,
  checkedInEmail,
  checkedOutEmail,
  checkinReminderEmail,
} from "../../emails/templates/booking";
import { paymentFailedEmail, refundUpdatedEmail } from "../../emails/templates/payment";
import { welcomeEmail } from "../../emails/templates/welcome";
import { getEmailProvider } from "../../emails/email.provider";
import { EmailTemplateModel, toOverride } from "./email-template.model";
import type { ListEmailTemplatesQuery, UpdateEmailTemplateInput } from "./email-template.schema";

export interface EmailTemplateView {
  key: EmailTemplateKey;
  name: string;
  category: string;
  description: string;
  requiredVars: string[];
  optionalVars: string[];
  essential: boolean;
  notificationType: string | null;
  subject: string;
  isEnabled: boolean;
  isCustomized: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface OverrideRow {
  subject: string;
  htmlBody: string;
  textBody: string;
  isEnabled: boolean;
  updatedBy: string | null;
  updatedAt: Date;
}

/** Code default render for any key, filled with realistic dummy data. */
export function codeDefaultFor(key: EmailTemplateKey): RenderedEmail {
  const booking = dummyBookingContext();
  switch (key) {
    case "BOOKING_RECEIVED":
      return bookingReceivedEmail(booking);
    case "BOOKING_CONFIRMED":
      return bookingConfirmedEmail(booking);
    case "PAYMENT_FAILED":
      return paymentFailedEmail({
        guestName: booking.guestName,
        bookingReference: booking.bookingReference,
        holdExpiresAt: "23 Dec 2026, 4:00 pm",
        supportEmail: booking.supportEmail,
        manageUrl: booking.manageUrl,
      });
    case "REFUND_UPDATED":
      return refundUpdatedEmail({
        guestName: booking.guestName,
        bookingReference: booking.bookingReference,
        currency: booking.currency,
        refundAmount: booking.total,
        refundStatus: "succeeded",
        supportEmail: booking.supportEmail,
      });
    case "BOOKING_CANCELLED":
      return bookingCancelledEmail({
        ...booking,
        cancelledAt: "18 Dec 2026",
        refundAmount: booking.total,
        refundStatus: "succeeded",
      });
    case "CHECKIN_REMINDER":
      return checkinReminderEmail(booking);
    case "CHECKED_IN":
      return checkedInEmail(booking);
    case "CHECKED_OUT":
      return checkedOutEmail(booking);
    case "PASSWORD_RESET":
      return passwordResetEmail(
        booking.guestName,
        "https://book.hamptworthstays.com/reset-password?token=preview-token",
      );
    case "PASSWORD_CHANGED":
      return passwordChangedEmail(booking.guestName);
    case "WELCOME":
      return welcomeEmail(booking.guestName);
    case "REGISTER":
      // Alias of WELCOME (registration greeting).
      return welcomeEmail(booking.guestName);
    case "ADMIN_NEW_BOOKING":
      return adminAlertEmail(
        {
          bookingReference: booking.bookingReference,
          headline: "New booking",
          detail: "Alexandra Morgan, Fern Cottage, 20 Dec 2026 → 23 Dec 2026.",
          adminUrl: "https://admin.hamptworthstays.com/reservations/abc123",
        },
        "New booking",
      );
    case "ADMIN_PAYMENT_FAILURE":
      return adminAlertEmail(
        {
          bookingReference: booking.bookingReference,
          headline: "Payment failure",
          detail: "Payment for Alexandra Morgan failed. Booking is failed.",
          adminUrl: "https://admin.hamptworthstays.com/reservations/abc123",
        },
        "Payment failure",
      );
    case "ADMIN_CANCELLATION":
      return adminAlertEmail(
        {
          bookingReference: booking.bookingReference,
          headline: "Booking cancelled",
          detail: "Cancelled by guest/admin. Payment state: paid.",
          adminUrl: "https://admin.hamptworthstays.com/reservations/abc123",
        },
        "Booking cancelled",
      );
    case "ADMIN_SOLD_OUT":
      return adminAlertEmail(
        {
          bookingReference: booking.bookingReference,
          headline: "Fully booked",
          detail: "All rooms are now sold for 20 Dec 2026 → 23 Dec 2026. Triggered by this booking.",
          adminUrl: "https://admin.hamptworthstays.com/reservations/abc123",
        },
        "Fully booked",
      );
    default: {
      const exhaustive: never = key;
      throw new Error(`No default render for email template ${String(exhaustive)}`);
    }
  }
}

async function overrideMap(): Promise<Map<string, OverrideRow & { updatedAt: Date }>> {
  const docs = await EmailTemplateModel.find({}).exec();
  const map = new Map<string, OverrideRow & { updatedAt: Date }>();
  for (const doc of docs) {
    const row = toOverride(doc);
    map.set(row.key, row);
  }
  return map;
}

function viewFor(key: EmailTemplateKey, override?: OverrideRow & { updatedAt: Date }): EmailTemplateView {
  const def = templateDefinition(key);
  return {
    key,
    name: def.name,
    category: def.category,
    description: def.description,
    requiredVars: def.requiredVars,
    optionalVars: def.optionalVars,
    essential: def.essential,
    notificationType: def.notificationType,
    subject: override?.subject?.trim() ? override.subject : codeDefaultFor(key).subject,
    isEnabled: override?.isEnabled ?? true,
    isCustomized: Boolean(override),
    updatedAt: override ? override.updatedAt.toISOString() : null,
    updatedBy: override?.updatedBy ?? null,
  };
}

export async function listEmailTemplates(query: ListEmailTemplatesQuery): Promise<EmailTemplateView[]> {
  const overrides = await overrideMap();
  const search = query.search?.toLowerCase();
  return EMAIL_TEMPLATE_KEYS.map((key) => viewFor(key, overrides.get(key))).filter((view) => {
    if (query.category && view.category !== query.category) return false;
    if (query.status === "enabled" && !view.isEnabled) return false;
    if (query.status === "disabled" && view.isEnabled) return false;
    if (search && !`${view.name} ${view.key} ${view.description}`.toLowerCase().includes(search)) {
      return false;
    }
    return true;
  });
}

export interface EmailTemplateDetail extends EmailTemplateView {
  htmlBody: string | null;
  textBody: string | null;
  starter: { subject: string; htmlBody: string; textBody: string };
  /**
   * The code-default render converted back into editable {{variables}} —
   * what the editor pre-fills for uncustomized templates. Re-rendering it
   * reproduces the default byte-for-byte (covered by tests).
   */
  editableSource: { subject: string; htmlBody: string; textBody: string };
}

export async function getEmailTemplate(key: EmailTemplateKey): Promise<EmailTemplateDetail> {
  const doc = await EmailTemplateModel.findOne({ key }).exec();
  const override = doc ? toOverride(doc) : undefined;
  const view = viewFor(key, override);
  return {
    ...view,
    htmlBody: override?.htmlBody ?? null,
    textBody: override?.textBody ?? null,
    starter: starterFor(key),
    editableSource: editableSourceFor(key),
  };
}

/**
 * Converts the code-default render back into editable {{variables}} by
 * replacing dummy values with their placeholder names (longest first, so
 * amounts win over bare currency). Counts and status words are restored
 * only inside their exact rendered phrases to avoid corrupting labels
 * such as "Total paid:". Values absent from the key's allowed list are
 * never converted, so the result always saves cleanly.
 */
export function editableSourceFor(key: EmailTemplateKey): {
  subject: string;
  htmlBody: string;
  textBody: string;
} {
  const def = templateDefinition(key);
  const allowed = new Set([...def.requiredVars, ...def.optionalVars]);
  const vars = dummyStringVars(key);
  const codeDefault = codeDefaultFor(key);
  // Plain values safe to restore anywhere (unique, non-numeric, in-allowlist).
  const skipPlain = new Set(["nights", "paymentStatus", "currency", "propertyName"]);
  const pairs = Object.entries(vars)
    .filter(([name, value]) => allowed.has(name) && !skipPlain.has(name) && value.trim().length >= 4)
    .sort((a, b) => b[1].length - a[1].length);
  const restore = (source: string): string => {
    let out = source;
    if (allowed.has("nights") && vars.nights) {
      out = out.split(`${vars.nights} nights`).join("{{nights}} nights");
      out = out.split(`${vars.nights} night`).join("{{nights}} night");
      out = out.split(`>${vars.nights} / `).join(">{{nights}} / ");
    }
    if (allowed.has("paymentStatus") && vars.paymentStatus) {
      out = out.split(`(${vars.paymentStatus})`).join("({{paymentStatus}})");
    }
    for (const [name, value] of pairs) {
      if (!value) continue;
      out = out.split(value).join(`{{${name}}}`);
    }
    return out;
  };
  return {
    subject: restore(codeDefault.subject),
    htmlBody: restore(codeDefault.html),
    textBody: restore(codeDefault.text),
  };
}

/**
 * Brand skeleton with every {{variable}} already placed (as an invisible
 * HTML comment plus natural greeting/sign-off), so admins start from clean,
 * valid markup — never dummy values baked into visible copy.
 */
export function starterFor(key: EmailTemplateKey): { subject: string; htmlBody: string; textBody: string } {
  const def = templateDefinition(key);
  const allVars = [...def.requiredVars, ...def.optionalVars];
  const varComment = `<!-- Available variables: ${allVars.map((name) => `{{${name}}}`).join(" ")} -->`;
  const subject = codeDefaultFor(key).subject.replace(/QB-[A-Z0-9]+|Fern Cottage|Deluxe Room/g, (m) =>
    m.startsWith("QB-") ? "{{bookingReference}}" : "{{cottageName}}",
  );
  const htmlBody = `<div style="font-family: Arial,Helvetica,sans-serif; font-size: 15px; line-height: 1.9; color: #526157;">\n<p>Hello {{guestName}},</p>\n<p>[Write your message here. Click a variable below to insert it.]</p>\n<p>Warm wishes,<br />The Hamptworth Stays Team</p>\n</div>\n${varComment}`;
  const textBody = [`Hello {{guestName}},`, ``, `[Write your message here.]`, ``, `Warm wishes,`, `The Hamptworth Stays Team`].join("\n");
  return { subject, htmlBody, textBody };
}

function allowedVars(key: EmailTemplateKey): string[] {
  const def = templateDefinition(key);
  return [...def.requiredVars, ...def.optionalVars];
}

/** Every required {{var}} must appear somewhere across the three fields. */
function assertRequiredPresent(key: EmailTemplateKey, subject: string, htmlBody: string, textBody: string): void {
  const def = templateDefinition(key);
  const present = new Set([
    ...extractPlaceholders(subject),
    ...extractPlaceholders(htmlBody),
    ...extractPlaceholders(textBody),
  ]);
  const missing = def.requiredVars.filter((name) => !present.has(name));
  if (missing.length > 0) {
    throw new AppError(
      `Template is missing required variables: ${missing.join(", ")}`,
      400,
      "EMAIL_TEMPLATE_VARS_MISSING",
    );
  }
}

function assertAllowed(key: EmailTemplateKey, ...fields: string[]): void {
  const allowed = new Set(allowedVars(key));
  const unknown = new Set<string>();
  for (const field of fields) {
    for (const name of extractPlaceholders(field)) {
      if (!allowed.has(name)) unknown.add(name);
    }
  }
  if (unknown.size > 0) {
    throw new AppError(
      `Template uses unknown variables: ${[...unknown].sort().join(", ")}. Allowed: ${[...allowed].sort().join(", ")}`,
      400,
      "EMAIL_TEMPLATE_VARS_UNKNOWN",
    );
  }
}

export async function updateEmailTemplate(
  key: EmailTemplateKey,
  input: UpdateEmailTemplateInput,
  actorId: string | null,
): Promise<EmailTemplateDetail> {
  const existing = await EmailTemplateModel.findOne({ key }).exec();
  const subject = (input.subject ?? existing?.subject ?? "").trim();
  const htmlBody = input.htmlBody ?? existing?.htmlBody ?? "";
  const textBody = input.textBody ?? existing?.textBody ?? "";
  const isEnabled = input.isEnabled ?? existing?.isEnabled ?? true;
  if (!subject && !htmlBody.trim() && !textBody.trim()) {
    // Clearing every field restores the default design.
    await EmailTemplateModel.findOneAndDelete({ key }).exec();
    return getEmailTemplate(key);
  }
  assertAllowed(key, subject, htmlBody, textBody);
  if (isEnabled) {
    // Blank fields fall back to the code default (complete by
    // construction), so required variables are enforced only when every
    // field is customized.
    if (subject.trim() && htmlBody.trim() && textBody.trim()) {
      assertRequiredPresent(key, subject, htmlBody, textBody);
    }
  }
  const sanitizedHtml = htmlBody.trim() ? sanitizeEmailHtml(htmlBody) : "";
  if (htmlBody.trim() && !sanitizedHtml.trim()) {
    throw new AppError("Template HTML was rejected as unsafe", 400, "EMAIL_TEMPLATE_UNSAFE");
  }
  const doc = await EmailTemplateModel.findOneAndUpdate(
    { key },
    {
      $set: {
        subject: subject || codeDefaultFor(key).subject,
        htmlBody: sanitizedHtml,
        textBody: textBody.trim(),
        isEnabled,
        updatedBy: actorId,
      },
    },
    { returnDocument: "after", upsert: true },
  ).exec();
  if (!doc) throw new AppError("Template update failed", 500, "EMAIL_TEMPLATE_SAVE_FAILED");
  return getEmailTemplate(key);
}

export async function findTemplateOverride(key: EmailTemplateKey): Promise<OverrideRow | null> {
  const doc = await EmailTemplateModel.findOne({ key }).exec();
  return doc ? toOverride(doc) : null;
}

function renderTextPlaceholders(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g, (_full, name: string) => vars[name] ?? "");
}

/**
 * Pure override render: blank override fields fall back to the matching
 * code-default part, so subject-only (or body-only) customizations work.
 * Throws on unknown variables or empty results — callers fall back to code.
 */
export function renderWithOverride(
  key: EmailTemplateKey,
  vars: Record<string, string>,
  codeDefault: RenderedEmail,
  override: OverrideRow | null,
): { rendered: RenderedEmail; source: "custom" | "default" } {
  if (!override || !override.isEnabled) return { rendered: codeDefault, source: "default" };
  const subjectCustom = override.subject.trim();
  const htmlCustom = override.htmlBody.trim();
  const textCustom = override.textBody.trim();
  if (!subjectCustom && !htmlCustom && !textCustom) {
    return { rendered: codeDefault, source: "default" };
  }
  const allowed = allowedVars(key);
  const unknown = [
    ...extractPlaceholders(subjectCustom),
    ...extractPlaceholders(htmlCustom),
    ...extractPlaceholders(textCustom),
  ].filter((name, index, all) => !allowed.includes(name) && all.indexOf(name) === index);
  if (unknown.length > 0) throw new Error(`unknown variables: ${unknown.join(", ")}`);
  const html = htmlCustom
    ? renderPlaceholderTemplate(sanitizeEmailHtml(htmlCustom), vars, allowed, key)
    : codeDefault.html;
  const subject = subjectCustom
    ? renderPlaceholderTemplate(subjectCustom, vars, allowed, key)
    : codeDefault.subject;
  const text = textCustom
    ? renderTextPlaceholders(textCustom, vars).trim() || htmlToText(html)
    : codeDefault.text;
  if (!subject.trim() || !html.trim()) throw new Error("override renders empty");
  return { rendered: { subject, html, text }, source: "custom" };
}

/**
 * Resolves the final render: enabled DB override wins, otherwise the typed
 * code default. A broken override never silences transactional mail — it
 * logs and falls back to code.
 */
export async function resolveTemplate(
  key: EmailTemplateKey,
  vars: Record<string, string>,
  codeDefault: RenderedEmail,
): Promise<{ rendered: RenderedEmail; source: "custom" | "default" }> {
  let override: OverrideRow | null = null;
  try {
    override = await findTemplateOverride(key);
  } catch (error) {
    logger.error("Email template lookup failed, using default", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
    return { rendered: codeDefault, source: "default" };
  }
  try {
    return renderWithOverride(key, vars, codeDefault, override);
  } catch (error) {
    logger.error("Email template override failed, using default", {
      key,
      message: error instanceof Error ? error.message : String(error),
    });
    return { rendered: codeDefault, source: "default" };
  }
}

/** Preview any template with realistic dummy data — the exact send path. */
export async function previewEmailTemplate(key: EmailTemplateKey): Promise<{
  subject: string;
  html: string;
  text: string;
  source: "custom" | "default";
  variables: { required: string[]; optional: string[] };
  /** Dummy {{variable}} values, so admin clients can render live local previews. */
  dummyVars: Record<string, string>;
}> {
  const def = templateDefinition(key);
  const vars = dummyStringVars(key);
  const { rendered, source } = await resolveTemplate(key, vars, codeDefaultFor(key));
  return {
    ...rendered,
    source,
    variables: { required: def.requiredVars, optional: def.optionalVars },
    dummyVars: vars,
  };
}

/**
 * Live draft preview: renders the *unsaved* editor content with dummy data.
 * Empty fields fall back to the code default so mid-typing previews never
 * go blank. Unknown {{variables}} and unsafe HTML are 400s so the editor
 * can show the problem inline.
 */
export function renderDraftPreview(
  key: EmailTemplateKey,
  draft: { subject?: string; htmlBody?: string; textBody?: string },
): {
  subject: string;
  html: string;
  text: string;
  source: "draft";
  variables: { required: string[]; optional: string[] };
} {
  const def = templateDefinition(key);
  const allowed = allowedVars(key);
  const provided = [draft.subject ?? "", draft.htmlBody ?? "", draft.textBody ?? ""];
  const unknown = new Set<string>();
  for (const field of provided) {
    for (const name of extractPlaceholders(field)) {
      if (!allowed.includes(name)) unknown.add(name);
    }
  }
  if (unknown.size > 0) {
    throw new AppError(
      `Unknown variables: ${[...unknown].sort().join(", ")}. Allowed: ${allowed.sort().join(", ")}`,
      400,
      "EMAIL_TEMPLATE_VARS_UNKNOWN",
    );
  }
  const codeDefault = codeDefaultFor(key);
  const vars = dummyStringVars(key);
  const subjectSrc = draft.subject?.trim() ? draft.subject : codeDefault.subject;
  const htmlSrc = draft.htmlBody?.trim() ? draft.htmlBody : codeDefault.html;
  const textSrc = draft.textBody?.trim() ? draft.textBody : codeDefault.text;
  let html = htmlSrc === codeDefault.html ? htmlSrc : sanitizeEmailHtml(htmlSrc);
  if (!html.trim()) {
    throw new AppError("Template HTML was rejected as unsafe", 400, "EMAIL_TEMPLATE_UNSAFE");
  }
  const subject =
    subjectSrc === codeDefault.subject
      ? subjectSrc
      : renderPlaceholderTemplate(subjectSrc, vars, allowed, key);
  if (htmlSrc !== codeDefault.html) {
    html = renderPlaceholderTemplate(html, vars, allowed, key);
  }
  const text =
    textSrc === codeDefault.text
      ? textSrc
      : renderTextPlaceholders(textSrc, vars).trim() || htmlToText(html);
  if (!subject.trim()) {
    throw new AppError("Template needs a subject", 400, "EMAIL_TEMPLATE_EMPTY");
  }
  return {
    subject,
    html,
    text,
    source: "draft",
    variables: { required: def.requiredVars, optional: def.optionalVars },
  };
}

/** Test-send a preview render to an explicitly entered recipient. Never queued. */
export async function sendTestEmailTemplate(key: EmailTemplateKey, to: string): Promise<{ provider: string; providerMessageId: string | null }> {
  const preview = await previewEmailTemplate(key);
  const result = await getEmailProvider().send(to, {
    subject: `[TEST] ${preview.subject}`,
    html: preview.html,
    text: preview.text,
  });
  logger.info("Email template test sent", { key, to, provider: result.provider });
  return result;
}

/** Live string {{vars}} for placeholder rendering, derived from a booking snapshot. */
export function bookingTemplateVars(snapshot: {
  guestName: string;
  bookingReference: string;
  propertyName: string;
  roomSummary: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: string;
  currency: string;
  total: number;
  totalPaid: number;
  paymentStatus: string;
  cancellationPolicy: string;
  supportEmail: string;
  manageUrl: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  propertyAddress?: string | null;
  mapsUrl?: string | null;
  brandName?: string | null;
  brandSiteUrl?: string | null;
  bookingSiteUrl?: string | null;
}): Record<string, string> {
  const brand = snapshot.brandName?.trim() || snapshot.propertyName;
  const address = snapshot.propertyAddress?.trim() || "";
  return {
    guestName: snapshot.guestName,
    propertyName: snapshot.propertyName,
    brandName: brand,
    cottageName: snapshot.roomSummary,
    bookingReference: snapshot.bookingReference,
    checkIn: snapshot.checkIn,
    checkOut: snapshot.checkOut,
    nights: String(snapshot.nights),
    guests: snapshot.guests,
    currency: snapshot.currency,
    total: money(snapshot.total, snapshot.currency),
    totalPaid: money(snapshot.totalPaid, snapshot.currency),
    paymentStatus: snapshot.paymentStatus,
    cancellationPolicy: snapshot.cancellationPolicy,
    supportEmail: snapshot.supportEmail,
    manageUrl: snapshot.manageUrl,
    checkInTime: checkInLabel(snapshot.checkInTime),
    checkOutTime: checkOutLabel(snapshot.checkOutTime),
    propertyAddress: address,
    mapsUrl: snapshot.mapsUrl?.trim() || mapsDirectionsUrl(address) || "",
    brandSiteUrl: snapshot.brandSiteUrl || "https://hamptworthstays.com/",
    bookingSiteUrl: snapshot.bookingSiteUrl || "https://book.hamptworthstays.com/",
  };
}
