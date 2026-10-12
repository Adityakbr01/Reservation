import { randomUUID } from "node:crypto";
import { AppError } from "../../utils/app-error";
import { slugify } from "../../utils/slug";

/**
 * GoDaddy FTP storage keys (see migrate-imagekit-to-godaddy.md).
 *
 * The FTP account is jailed to the uploads/ directory, so every key is
 * relative to that root: `media/<yyyy>/<mm>/<uuid>-<slug>.<ext>` or
 * `avatars/<userId>-<ts>-<uuid>.<ext>`. Pure — unit-tested.
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

const KEY_PATTERN = /^(media|avatars)\/[A-Za-z0-9][A-Za-z0-9._/-]*$/;
const MAX_KEY_LENGTH = 220;

/**
 * Root-jail guard. Throws before any FTP command when the key could escape
 * the uploads/ root. Mandatory: the FTP account has full home access.
 */
export function assertStorageKey(key: string): void {
  if (
    key.length === 0 ||
    key.length > MAX_KEY_LENGTH ||
    key.includes("..") ||
    key.includes("\\") ||
    key.startsWith("/") ||
    !KEY_PATTERN.test(key)
  ) {
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

/** Library key, e.g. media/2026/10/3f2a1c9e-homepage-banner.webp */
export function buildMediaKey(originalName: string, mime: string, now: Date = new Date()): string {
  const key = `media/${datePrefix(now)}/${safeFileSuffix(originalName, mime)}`;
  assertStorageKey(key);
  return key;
}

/** Avatar key, e.g. avatars/<userId>-1728650000000-3f2a1c9e-photo.png */
export function buildAvatarKey(
  userId: string,
  originalName: string,
  mime: string,
  nowMs: number = Date.now(),
): string {
  const safeUser = userId.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) || "user";
  const key = `avatars/${safeUser}-${nowMs}-${safeFileSuffix(originalName, mime)}`;
  assertStorageKey(key);
  return key;
}

/** Public URL for a stored key. Tolerates a trailing slash on the base. */
export function publicAssetUrl(baseUrl: string, key: string): string {
  assertStorageKey(key);
  return `${baseUrl.replace(/\/+$/, "")}/${key}`;
}

/** Parent directory of a key for ensureDir, e.g. media/2026/10 */
export function parentDirOf(key: string): string {
  assertStorageKey(key);
  return key.split("/").slice(0, -1).join("/");
}
