import { randomUUID } from "node:crypto";
import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import { slugify } from "../../utils/slug";

/**
 * GoDaddy FTP storage keys (see migrate-imagekit-to-godaddy.md).
 *
 * Keys are relative to the FTP account's jail root. With GODADDY_FTP_PREFIX
 * set (e.g. "uploads"), keys look like `uploads/media/<yyyy>/<mm>/<uuid>-<slug>.<ext>`;
 * empty prefix keeps the bare `media/…` / `avatars/…` form. Pure — unit-tested
 * (prefix injectable so tests never depend on process env).
 */

export type StorageKind = "media" | "avatars";

/** MIME allow-list mirrors server/src/middleware/upload.ts. Extension comes from MIME, never the client. */
const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/avif": ".avif",
  "video/mp4": ".mp4",
  "video/webm": ".webm",
};

const SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const MAX_KEY_LENGTH = 220;

/** Sanitized configured prefix segments ("" when unset). Throws on hostile config. */
export function storagePrefixSegments(prefix: string = env.GODADDY_FTP_PREFIX): string[] {
  if (prefix.startsWith("/")) {
    throw new AppError("Invalid GODADDY_FTP_PREFIX", 500, "INVALID_STORAGE_CONFIG");
  }
  const cleaned = prefix.trim().replace(/\/+$/g, "");
  if (cleaned === "") return [];
  const segments = cleaned.split("/");
  for (const segment of segments) {
    if (segment === "media" || segment === "avatars" || !SEGMENT_PATTERN.test(segment)) {
      throw new AppError("Invalid GODADDY_FTP_PREFIX", 500, "INVALID_STORAGE_CONFIG");
    }
  }
  return segments;
}

/**
 * Root-jail guard. Every segment must be a safe name (no "..", no backslash,
 * no empty/absolute segments) and the key must pass through a media/ or
 * avatars/ directory. Throws before any FTP command.
 */
export function assertStorageKey(key: string): void {
  if (key.length === 0 || key.length > MAX_KEY_LENGTH || key.includes("\\")) {
    throw new AppError("Invalid storage key", 500, "INVALID_STORAGE_KEY");
  }
  const segments = key.split("/");
  let kindSeen = false;
  for (const segment of segments) {
    if (!SEGMENT_PATTERN.test(segment)) {
      throw new AppError("Invalid storage key", 500, "INVALID_STORAGE_KEY");
    }
    if (segment === "media" || segment === "avatars") kindSeen = true;
  }
  // The file must live inside media/ or avatars/ (not beside them).
  const kindIndex = segments.findIndex((s) => s === "media" || s === "avatars");
  if (!kindSeen || kindIndex === segments.length - 1) {
    throw new AppError("Invalid storage key", 500, "INVALID_STORAGE_KEY");
  }
}

/** Disk-safe suffix from the client filename; MIME decides the extension. */
function safeFileSuffix(originalName: string, mime: string): string {
  const ext = MIME_TO_EXT[mime];
  if (!ext) {
    throw new AppError("Only JPEG, PNG, WebP, AVIF images or MP4/WebM video are allowed", 400, "INVALID_FILE_TYPE");
  }
  const base = slugify(originalName.replace(/\.[A-Za-z0-9]{1,5}$/, "")) || "file";
  return `${randomUUID().slice(0, 8)}-${base.slice(0, 60)}${ext}`;
}

function datePrefix(now: Date): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${yyyy}/${mm}`;
}

function withPrefix(parts: string[], prefix?: string): string {
  const key = [...storagePrefixSegments(prefix), ...parts].join("/");
  assertStorageKey(key);
  return key;
}

/** Library key, e.g. uploads/media/2026/10/3f2a1c9e-homepage-banner.webp */
export function buildMediaKey(
  originalName: string,
  mime: string,
  now: Date = new Date(),
  prefix?: string,
): string {
  return withPrefix(["media", datePrefix(now), safeFileSuffix(originalName, mime)], prefix);
}

/** Avatar key, e.g. uploads/avatars/<userId>-1728650000000-3f2a1c9e-photo.png */
export function buildAvatarKey(
  userId: string,
  originalName: string,
  mime: string,
  nowMs: number = Date.now(),
  prefix?: string,
): string {
  const safeUser = userId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) || "user";
  return withPrefix([`avatars`, `${safeUser}-${nowMs}-${safeFileSuffix(originalName, mime)}`], prefix);
}

/** Public URL for a stored key. Tolerates a trailing slash on the base. */
export function publicAssetUrl(baseUrl: string, key: string): string {
  assertStorageKey(key);
  return `${baseUrl.replace(/\/+$/, "")}/${key}`;
}

/** Parent directory of a key for ensureDir, e.g. uploads/media/2026/10 */
export function parentDirOf(key: string): string {
  assertStorageKey(key);
  return key.split("/").slice(0, -1).join("/");
}
