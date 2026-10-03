/**
 * CMS content contract (docs 08). Pages, blogs, FAQs, offers, and policy
 * documents share one lifecycle; only PUBLISHED rows ever reach public
 * readers. Draft preview is token-only, never `?status=draft`.
 */
export const CONTENT_STATUSES = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const SECTION_TYPES = [
  "HERO",
  "EDITORIAL_TEXT",
  "SPLIT_CONTENT",
  "IMAGE_GALLERY",
  "ROOM_SHOWCASE",
  "FEATURE_GRID",
  "OFFER_CARD",
  "FAQ",
  "TESTIMONIALS",
  "LOCATION",
  "CTA",
  "CONTACT",
] as const;

export type SectionType = (typeof SECTION_TYPES)[number];

/** Slugs the CMS must never claim (docs 08 §11-12). */
export const RESERVED_SLUGS = [
  "admin",
  "api",
  "login",
  "auth",
  "checkout",
  "booking",
  "bookings",
  "payment",
  "payments",
  "webhooks",
  "assets",
  "media",
] as const;

export const POLICY_KEYS = [
  "CANCELLATION",
  "CHECKIN",
  "CHECKOUT",
  "CHILDREN",
  "PETS",
  "SMOKING",
  "PAYMENT",
  "PRIVACY",
  "TERMS",
] as const;

export type PolicyKey = (typeof POLICY_KEYS)[number];

export interface SeoMeta {
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  robots: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImageMediaId: string | null;
}

export const ROBOTS_ALLOWLIST = [
  "index,follow",
  "noindex,follow",
  "index,nofollow",
  "noindex,nofollow",
] as const;

export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 120;
}

export function isReservedSlug(slug: string): boolean {
  return (RESERVED_SLUGS as readonly string[]).includes(slug.toLowerCase());
}

const ALLOWED_URL_SCHEMES = ["https:", "http:", "mailto:", "tel:"];

/**
 * CTA/link target allowlist (docs 08 §68-69). Relative paths allowed;
 * javascript:/vbscript:/data: and unknown schemes rejected.
 */
export function isAllowedUrl(url: string): boolean {
  const trimmed = url.trim();
  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return true;
  if (trimmed.startsWith("#")) return true;
  try {
    const parsed = new URL(trimmed);
    return ALLOWED_URL_SCHEMES.includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Minimal rich-text sanitizer: strips scripts/iframes/objects, event
 * handler attributes, and style tags. Not a replacement for a scrubber
 * library if editors ever paste hostile markup — output is still escaped
 * at render boundaries by consumers.
 */
export function sanitizeRichText(html: string): string {
  return (
    html
      // Remove script/style/iframe/object/embed blocks entirely.
      .replace(/<(script|style|iframe|object|embed)[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<(script|style|iframe|object|embed)[^>]*\/?>/gi, "")
      // Remove event-handler attributes (onclick, onerror, ...).
      .replace(/\s+on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
      // Neutralize javascript:/vbscript:/data: hrefs and srcs.
      .replace(/\s+(href|src)\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi, (_match, attr, _q, d, s, u) => {
        const value = (d ?? s ?? u ?? "").trim();
        if (/^(javascript|vbscript|data):/i.test(value)) return ` ${attr}="#"`;
        return ` ${attr}="${value.replace(/"/g, "&quot;")}"`;
      })
      .trim()
  );
}

const TRANSITIONS: Record<ContentStatus, ContentStatus[]> = {
  DRAFT: ["PUBLISHED", "ARCHIVED"],
  PUBLISHED: ["DRAFT", "ARCHIVED"],
  ARCHIVED: ["DRAFT"],
};

export function canTransition(from: ContentStatus, to: ContentStatus): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function transitionError(from: ContentStatus, to: ContentStatus): string {
  return `Cannot move content from ${from} to ${to}`;
}
