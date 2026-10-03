/**
 * URL-safe slug: lowercase, ASCII, hyphen-separated.
 * "Deluxe Room" → "deluxe-room". Returns "" when nothing usable remains.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
