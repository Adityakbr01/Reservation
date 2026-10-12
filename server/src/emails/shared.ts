/**
 * Shared Hamptworth Stays email design system.
 *
 * Premium English countryside: minimal, elegant, welcoming, trustworthy.
 * - Forest green #263D32 (header band, headings, primary CTA, links)
 * - Warm ivory #F7F5EF (canvas + footer band)
 * - White #FFFFFF (content surfaces)
 * - Muted gold #D8C7A3 (tagline accents)
 * - Georgia serif headlines, Arial body — single-quoted stacks only, so
 *   inline style attributes stay valid (double quotes inside a
 *   double-quoted style attribute silently kills the whole attribute).
 *
 * Email-client rules: ~600px max content width, inline CSS only,
 * table-based shell with bgcolor fallbacks, no JavaScript, no external
 * stylesheets, no unsupported interactivity. Every template builds on
 * `layout` + `escapeHtml` so nothing can forget escaping or invent its
 * own shell.
 */
export interface RenderedEmail {
  subject: string;
  html: string;
  /** Plain-text alternative — always sent alongside HTML. */
  text: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function money(amount: number, currency: string): string {
  return `${escapeHtml(currency)} ${(amount / 100).toFixed(2)}`;
}

/**
 * Plain-text subject sanitizer. Subjects are header values, not HTML:
 * strip tags, newlines (header injection), and excess whitespace.
 */
export function safeSubjectText(value: string): string {
  return value
    .replace(/<[^>]*>/g, "")
    .replace(/[\r\n]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

/** Brand + booking-site links. No hardcoded cottage names here — callers pass them in. */
export const DEFAULT_BRAND_NAME = "Hamptworth Stays";
export const DEFAULT_BRAND_SITE_URL = "https://hamptworthstays.com/";
export const DEFAULT_BOOKING_SITE_URL = "https://book.hamptworthstays.com/";

/** Hamptworth Stays email palette (command-n.design). */
export const EMAIL_THEME = {
  canvas: "#F7F5EF",
  card: "#FFFFFF",
  ivory: "#F7F5EF",
  ivoryDeep: "#EFE9DA",
  hairline: "#D8C7A3",
  border: "#E9E5DA",
  divider: "#E9E5DA",
  ink: "#263D32",
  body: "#526157",
  muted: "#727C72",
  faint: "#899087",
  gold: "#D8C7A3",
  goldLight: "#EAD9AE",
  bronze: "#8A6D3B",
  forest: "#263D32",
  forestDeep: "#1C2E25",
  pine: "#1B2B23",
  footerMuted: "#A9B6AF",
} as const;

const SERIF = `Georgia,'Times New Roman',serif`;
const SANS = `Arial,Helvetica,sans-serif`;

export interface BrandLinks {
  brandName: string;
  brandSiteUrl: string;
  bookingSiteUrl: string;
}

export function brandLinks(overrides?: Partial<BrandLinks>): BrandLinks {
  return {
    brandName: overrides?.brandName?.trim() || DEFAULT_BRAND_NAME,
    brandSiteUrl: overrides?.brandSiteUrl?.trim() || DEFAULT_BRAND_SITE_URL,
    bookingSiteUrl: overrides?.bookingSiteUrl?.trim() || DEFAULT_BOOKING_SITE_URL,
  };
}

/** Absolute https/http logo URL for the header. Relative paths never render in inboxes. */
export function resolveLogoUrl(explicit?: string | null): string | null {
  const raw = explicit?.trim();
  if (!raw) return null;
  if (!/^https:\/\//i.test(raw)) return null;
  if (raw.length > 500) return null;
  return raw;
}

let configuredLogoUrl: string | null = null;

/** Boot seam: point the header at a hosted logo (EMAIL_LOGO_URL). Unset keeps the text lockup. */
export function setEmailLogoUrl(url: string | null | undefined): void {
  configuredLogoUrl = resolveLogoUrl(url);
}

export function emailLogoUrl(): string | null {
  return configuredLogoUrl;
}

/**
 * CTA/link target allowlist. Relative paths and anchors allowed;
 * javascript:/vbscript:/data: and unknown schemes rejected.
 */
export function isSafeEmailUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("#")) return true;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/** "16:00" -> "After 4 pm", "11:00" -> "Before 11 am". Falls back to raw value. */
export function formatArrivalTime(time: string | null | undefined, prefix: "After" | "Before"): string {
  if (!time) return prefix === "After" ? "After 4 pm" : "Before 11 am";
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return `${prefix} ${time}`;
  const hour = Number(match[1]);
  const minutes = match[2];
  const suffix = hour >= 12 ? "pm" : "am";
  let twelve = hour % 12;
  if (twelve === 0) twelve = 12;
  const rest = minutes === "00" ? "" : `:${minutes}`;
  return `${prefix} ${twelve}${rest} ${suffix}`;
}

export function checkInLabel(time: string | null | undefined): string {
  return formatArrivalTime(time, "After");
}

export function checkOutLabel(time: string | null | undefined): string {
  return formatArrivalTime(time, "Before");
}

/** Builds a Google Maps directions link for any address — no hardcoded address. */
export function mapsDirectionsUrl(address: string | null | undefined): string | null {
  const trimmed = address?.trim();
  if (!trimmed) return null;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(trimmed)}`;
}

/** Forest-green rectangular CTA — the single primary action per email. */
export function emailButton(url: string, label: string): string {
  const safeUrl = isSafeEmailUrl(url) ? url : "#";
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 28px 0 4px 0;"><tr><td align="center" class="hs-btn-cell" bgcolor="${EMAIL_THEME.forest}" style="border-radius: 4px; background-color: ${EMAIL_THEME.forest};"><a href="${escapeHtml(safeUrl)}" style="display: inline-block; padding: 16px 28px; font-family: ${SANS}; font-size: 13px; font-weight: bold; letter-spacing: 0.5px; text-transform: uppercase; color: #FFFFFF; text-decoration: none;"><span style="color: #FFFFFF; text-decoration: none;">${label} &rarr;</span></a></td></tr></table>`;
}

/** Short muted-gold rule used under headlines. */
export function goldRule(): string {
  return `<div style="width: 56px; height: 2px; background-color: ${EMAIL_THEME.gold}; margin: 14px 0 4px 0;"></div>`;
}

/** Centered gold rule for the header block. */
export function goldRuleCentered(): string {
  return `<div style="text-align: center; margin: 12px 0 4px 0;"><div style="display: inline-block; width: 56px; height: 2px; background-color: ${EMAIL_THEME.gold};"></div></div>`;
}

/** Small uppercase eyebrow in muted bronze-gold. */
export function eyebrow(text: string): string {
  return `<p style="margin: 0; font-family: ${SANS}; font-size: 11px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: ${EMAIL_THEME.bronze};">${escapeHtml(text)}</p>`;
}

/** Small uppercase eyebrow — pale gold, for dark green bands only. */
export function eyebrowOnDark(text: string): string {
  return `<p style="margin: 0; font-family: ${SANS}; font-size: 11px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: ${EMAIL_THEME.goldLight};">${escapeHtml(text)}</p>`;
}

/** Section heading inside the body (Georgia serif, forest green). */
export function sectionTitle(text: string): string {
  return `<h2 style="margin: 30px 0 12px 0; font-family: ${SERIF}; font-size: 22px; line-height: 1.3; font-weight: normal; color: ${EMAIL_THEME.ink};">${escapeHtml(text)}</h2>`;
}

/** Body paragraph in the brand voice. */
export function p(text: string): string {
  return `<p style="margin: 0 0 18px 0; font-family: ${SANS}; font-size: 15px; line-height: 1.9; color: ${EMAIL_THEME.body};">${text}</p>`;
}

/** Light info panel with hairline border — arrival / address / notice blocks. */
export function infoCard(inner: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 20px 0;"><tr><td bgcolor="${EMAIL_THEME.ivory}" style="background-color: ${EMAIL_THEME.ivory}; border: 1px solid ${EMAIL_THEME.border}; border-radius: 4px; padding: 20px 22px;">${inner}</td></tr></table>`;
}

/** Two-column label/value row for info panels. */
export function infoRow(label: string, value: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 8px 0;"><tr><td style="font-family: ${SANS}; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; color: ${EMAIL_THEME.muted}; padding: 2px 0;">${label}</td><td align="right" style="font-family: ${SERIF}; font-size: 17px; color: ${EMAIL_THEME.ink}; padding: 2px 0;">${value}</td></tr></table>`;
}

/** Booking-reference pill — calm, scannable, on-brand. */
export function refPill(reference: string): string {
  return `<span style="display: inline-block; font-family: ${SANS}; font-size: 12px; font-weight: bold; letter-spacing: 1px; color: ${EMAIL_THEME.forest}; background-color: #FFFFFF; border: 1px solid ${EMAIL_THEME.hairline}; border-radius: 999px; padding: 5px 14px;">${escapeHtml(reference)}</span>`;
}

/** Booking-reference pill — inverted gold, for dark green surfaces only. */
export function refPillLight(reference: string): string {
  return `<span style="display: inline-block; font-family: ${SANS}; font-size: 12px; font-weight: bold; letter-spacing: 1px; color: ${EMAIL_THEME.goldLight}; background-color: transparent; border: 1px solid ${EMAIL_THEME.gold}; border-radius: 999px; padding: 5px 14px;">${escapeHtml(reference)}</span>`;
}

/**
 * Stay summary panel — bordered box with the cottage name in forest serif,
 * stay details in body text, and the booking reference pill.
 */
export function heroCard(reference: string, cottageName: string, detailLine: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin: 24px 0;"><tr><td bgcolor="${EMAIL_THEME.ivory}" style="background-color: ${EMAIL_THEME.ivory}; border: 1px solid ${EMAIL_THEME.border}; border-radius: 4px; padding: 24px 24px 22px 24px;"><p style="margin: 0 0 6px 0; font-family: ${SANS}; font-size: 11px; font-weight: bold; letter-spacing: 3px; text-transform: uppercase; color: ${EMAIL_THEME.muted};">Your stay</p><p style="margin: 0 0 8px 0; font-family: ${SERIF}; font-size: 24px; line-height: 1.25; color: ${EMAIL_THEME.ink};">${escapeHtml(cottageName)}</p><p style="margin: 0 0 14px 0; font-family: ${SANS}; font-size: 14px; line-height: 1.8; color: ${EMAIL_THEME.body};">${detailLine}</p>${refPill(reference)}</td></tr></table>`;
}

/** Quiet text links row (Explore / Booking website) in forest green. */
export function textLinks(links: Array<{ url: string; label: string }>): string {
  const items = links
    .map((link) => {
      const safeUrl = isSafeEmailUrl(link.url) ? link.url : "#";
      return `<a href="${escapeHtml(safeUrl)}" style="font-family: ${SANS}; font-size: 14px; font-weight: bold; color: ${EMAIL_THEME.forest}; text-decoration: underline;"><span style="color: ${EMAIL_THEME.forest};">${link.label}</span></a>`;
    })
    .join(`<span style="color: ${EMAIL_THEME.muted}; padding: 0 10px;">|</span>`);
  return `<p style="margin: 22px 0 0 0; font-family: ${SANS}; font-size: 14px; line-height: 2; color: ${EMAIL_THEME.body};">${items}</p>`;
}

export function siteLinksFooter(links: BrandLinks): string {
  return textLinks([
    { url: links.brandSiteUrl, label: `Explore ${links.brandName} →` },
    { url: links.bookingSiteUrl, label: `Visit our booking website →` },
  ]);
}

export interface LayoutOptions {
  /** Hidden preview snippet shown by inboxes next to the subject. */
  preheader?: string;
  /** Absolute https logo URL (see EMAIL_LOGO_URL). Text lockup when absent. */
  logoUrl?: string | null;
  /** Brand site URL for header/footer links. Defaults to the brand site. */
  brandSiteUrl?: string | null;
  /** Booking site URL for footer links. Defaults to the booking site. */
  bookingSiteUrl?: string | null;
}

/**
 * Hamptworth Stays shell: warm ivory canvas, white 600px card, forest
 * masthead with the brand lockup, left-aligned serif headline, generous
 * body, hairline divider, and an ivory footer band with links and
 * copyright. Table-based with bgcolor fallbacks for Outlook/Gmail;
 * responsive via fluid widths + a small mobile query.
 */
export function layout(
  title: string,
  greeting: string,
  body: string,
  footer: string,
  opts?: LayoutOptions,
): string {
  const preheader = (opts?.preheader ?? title).slice(0, 140);
  const logoUrl = resolveLogoUrl(opts?.logoUrl) ?? emailLogoUrl();
  const brandSiteUrl =
    opts?.brandSiteUrl?.trim() || DEFAULT_BRAND_SITE_URL;
  const bookingSiteUrl =
    opts?.bookingSiteUrl?.trim() || DEFAULT_BOOKING_SITE_URL;
  const mastheadMark = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(DEFAULT_BRAND_NAME)}" width="150" style="display: inline-block; width: 150px; max-width: 62%; height: auto; border: 0; margin: 0 0 12px 0;" /><br />`
    : `<a href="${escapeHtml(brandSiteUrl)}" style="font-family: ${SERIF}; font-size: 28px; letter-spacing: 1px; color: #FFFFFF; text-decoration: none;"><span style="color: #FFFFFF;">${escapeHtml(DEFAULT_BRAND_NAME)}</span></a>`;
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="color-scheme" content="light" />
<title>${title}</title>
<style>
@media only screen and (max-width: 620px) {
  .hs-card { width: 100% !important; }
  .hs-pad-mast { padding: 26px 20px !important; }
  .hs-pad-body { padding: 28px 20px 24px !important; }
  .hs-title { font-size: 28px !important; }
  .hs-btn-cell a { padding: 15px 22px !important; }
}
</style>
</head>
<body style="margin: 0; padding: 0; background-color: ${EMAIL_THEME.canvas}; font-family: ${SANS}; color: ${EMAIL_THEME.ink};">
<div style="display: none; max-height: 0; overflow: hidden; opacity: 0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${EMAIL_THEME.canvas};">
<tr><td align="center" style="padding: 28px 10px 32px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" class="hs-card" style="width: 100%; max-width: 600px; background-color: ${EMAIL_THEME.card};" bgcolor="${EMAIL_THEME.card}">
<tr><td align="center" bgcolor="${EMAIL_THEME.forest}" class="hs-pad-mast" style="padding: 30px 24px; background-color: ${EMAIL_THEME.forest};">
${mastheadMark}
<p style="margin: 12px 0 0 0; font-family: ${SANS}; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: ${EMAIL_THEME.gold};"><span style="color: ${EMAIL_THEME.gold};">Your countryside escape</span></p>
</td></tr>
<tr><td class="hs-pad-body" style="padding: 36px 28px 30px 28px;">
<p style="margin: 0 0 18px 0; font-family: ${SANS}; font-size: 15px; line-height: 1.8; color: ${EMAIL_THEME.body};">Hello${greeting ? ` ${greeting}` : ""},</p>
<h1 class="hs-title" style="margin: 0 0 22px 0; font-family: ${SERIF}; font-size: 34px; line-height: 1.25; font-weight: normal; color: ${EMAIL_THEME.ink};">${title}</h1>
<div style="font-family: ${SANS};">${body}</div>
<p style="margin: 22px 0 0 0; font-family: ${SANS}; font-size: 14px; line-height: 1.8; color: ${EMAIL_THEME.body};">Warm wishes,<br /><strong style="color: ${EMAIL_THEME.ink};">The ${escapeHtml(DEFAULT_BRAND_NAME)} Team</strong></p>
</td></tr>
<tr><td style="padding: 0 32px;"><div style="border-top: 1px solid ${EMAIL_THEME.divider};"></div></td></tr>
<tr><td align="center" bgcolor="${EMAIL_THEME.ivory}" style="padding: 28px 24px; background-color: ${EMAIL_THEME.ivory};">
<p style="margin: 0 0 10px 0; font-family: ${SERIF}; font-size: 20px; color: ${EMAIL_THEME.ink};">${escapeHtml(DEFAULT_BRAND_NAME)}</p>
<p style="margin: 0 0 18px 0; font-family: ${SANS}; font-size: 12px; line-height: 1.8; color: ${EMAIL_THEME.muted};">Thoughtful stays. Memorable escapes.</p>
<p style="margin: 0 0 18px 0; font-family: ${SANS}; font-size: 12px; line-height: 1.8;"><a href="${escapeHtml(brandSiteUrl)}" style="color: ${EMAIL_THEME.forest}; text-decoration: underline;"><span style="color: ${EMAIL_THEME.forest};">Our Website</span></a><span style="color: ${EMAIL_THEME.muted};">&nbsp;&nbsp;|&nbsp;&nbsp;</span><a href="${escapeHtml(bookingSiteUrl)}" style="color: ${EMAIL_THEME.forest}; text-decoration: underline;"><span style="color: ${EMAIL_THEME.forest};">Book Your Stay</span></a></p>
<p style="margin: 0; font-family: ${SANS}; font-size: 11px; line-height: 1.8; color: ${EMAIL_THEME.faint};">${footer}</p>
<p style="margin: 12px 0 0 0; font-family: ${SANS}; font-size: 11px; color: ${EMAIL_THEME.faint};">&copy; ${year} ${escapeHtml(DEFAULT_BRAND_NAME)}. All rights reserved.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/**
 * Minimal HTML → text fallback. Templates should prefer hand-written `text`
 * (better line breaks and link placement); this covers DB overrides that
 * only supply HTML.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\s*\/\s*(p|div|tr|li|h\d)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 8000);
}

/** {{variable}} placeholder handling for admin-editable DB overrides. */
const PLACEHOLDER_PATTERN = /\{\{\s*([A-Za-z][A-Za-z0-9_]*)\s*\}\}/g;

export function extractPlaceholders(template: string): string[] {
  const found = new Set<string>();
  let match: RegExpExecArray | null;
  PLACEHOLDER_PATTERN.lastIndex = 0;
  while ((match = PLACEHOLDER_PATTERN.exec(template)) !== null) {
    found.add(match[1] as string);
  }
  return [...found].sort();
}

/** Throws when a required variable is missing or blank. */
export function requireVars(vars: Record<string, unknown>, required: string[], templateKey: string): void {
  const missing = required.filter((key) => {
    const value = vars[key];
    return value === undefined || value === null || String(value).trim() === "";
  });
  if (missing.length > 0) {
    throw new Error(`Email template ${templateKey} is missing required variables: ${missing.join(", ")}`);
  }
}

/**
 * Renders a DB-stored override by substituting approved {{variables}}.
 * Values are HTML-escaped; unknown placeholders are rejected so a typo
 * can never leak raw markup into an inbox.
 */
export function renderPlaceholderTemplate(
  template: string,
  vars: Record<string, string>,
  allowed: string[],
  templateKey: string,
): string {
  const allowedSet = new Set(allowed);
  const unknown = extractPlaceholders(template).filter((name) => !allowedSet.has(name));
  if (unknown.length > 0) {
    throw new Error(`Email template ${templateKey} uses unknown variables: ${unknown.join(", ")}`);
  }
  return template.replace(PLACEHOLDER_PATTERN, (_full, name: string) => escapeHtml(vars[name] ?? ""));
}

/**
 * Email-HTML sanitizer: same script/handler/unsafe-URL stripping as the CMS
 * rich-text sanitizer, but preserves <style> blocks - transactional mail
 * needs its responsive media queries, and dropping them on save would
 * silently break mobile rendering of every customized template.
 */
export function sanitizeEmailHtml(html: string): string {
  const styles: string[] = [];
  const withoutStyles = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, (match) => {
    styles.push(match);
    return `__EMAIL_STYLE_${styles.length - 1}__`;
  });
  // Inline copy of the CMS rich-text rules (minus the style-tag stripping).
  const clean = withoutStyles
    .replace(/<(script|iframe|object|embed)[^>]*>[\s\S]*?<\/>/gi, '')
    .replace(/<(script|iframe|object|embed)[^>]*\/?>/gi, '')
    .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/\s+(href|src)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi, (_match, attr, _q, d, s, u) => {
      const value = (d ?? s ?? u ?? '').trim();
      if (/^(javascript|vbscript|data):/i.test(value)) return ` ${attr}="#"`;
      return ` ${attr}="${value.replace(/"/g, '&quot;')}"`;
    })
    .trim();
  return clean.replace(/__EMAIL_STYLE_(\d+)__/g, (_full, index: string) => styles[Number(index)] ?? '');
}
