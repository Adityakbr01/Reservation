import fs from "node:fs";
import path from "node:path";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { assertStorageKey, publicAssetUrl } from "./storage-keys";

const BRIDGE_URL = "https://hamptworthstays.com/uploads/storage-api.php";

/** Uploads a buffer to cPanel /uploads via secure HTTPS Bridge (Port 443). */
export async function uploadBufferToGoDaddy(key: string, data: Buffer): Promise<string> {
  assertStorageKey(key);
  logger.info("[storage] Uploading to cPanel /uploads via HTTPS Bridge", { key, bytes: data.length });

  const token = env.JWT_SECRET;
  const res = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: {
      "X-Storage-Token": token,
      "X-Storage-Key": key,
      "Content-Type": "application/octet-stream",
    },
    body: data,
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(`cPanel storage bridge failed with HTTP ${res.status}: ${errorText}`);
  }

  const result = (await res.json()) as { success: boolean; url: string };
  logger.info("[storage] File stored successfully in cPanel /uploads", { key, url: result.url });
  return result.url;
}

/** Removes a file from cPanel /uploads via secure HTTPS Bridge (Port 443). */
export async function removeFileFromGoDaddy(key: string): Promise<void> {
  assertStorageKey(key);
  logger.info("[storage] Removing file from cPanel via HTTPS Bridge", { key });
  const token = env.JWT_SECRET;
  const res = await fetch(BRIDGE_URL, {
    method: "DELETE",
    headers: {
      "X-Storage-Token": token,
      "X-Storage-Key": key,
    },
  });

  if (!res.ok && res.status !== 404) {
    const errorText = await res.text().catch(() => "");
    logger.warn("[storage] cPanel file removal warning", { key, status: res.status, errorText });
  }
}

export function getUploadsDir(): string {
  return path.resolve(process.cwd(), "uploads");
}

export function getUploadsBaseUrl(): string {
  if (env.ASSETS_BASE_URL) {
    return env.ASSETS_BASE_URL.replace(/\/+$/, "");
  }
  if (env.NODE_ENV === "production") {
    return "https://api.hamptworthstays.com/uploads";
  }
  return `http://localhost:${env.PORT}/uploads`;
}

export async function saveFileLocally(key: string, data: Buffer): Promise<void> {
  assertStorageKey(key);
  const filePath = path.join(getUploadsDir(), key);
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  await fs.promises.writeFile(filePath, data);
}

export async function removeFileLocally(key: string): Promise<void> {
  assertStorageKey(key);
  const filePath = path.join(getUploadsDir(), key);
  if (fs.existsSync(filePath)) {
    await fs.promises.unlink(filePath).catch(() => undefined);
  }
}

/**
 * Universal storage dispatcher.
 * Supports both FTP and local persistent disk storage with automatic fallback.
 */
export async function uploadBuffer(
  key: string,
  data: Buffer,
): Promise<{ url: string; provider: "ftp" | "local" }> {
  assertStorageKey(key);
  logger.info("[storage] Initiating file upload", {
    key,
    bytes: data.length,
    configuredProvider: env.STORAGE_PROVIDER,
  });

  if (env.STORAGE_PROVIDER === "local") {
    await saveFileLocally(key, data);
    const url = publicAssetUrl(getUploadsBaseUrl(), key);
    logger.info("[storage] File stored successfully on local persistent disk", { key, url, provider: "local" });
    return { url, provider: "local" };
  }

  // Upload directly to cPanel /uploads via HTTPS Bridge
  try {
    const url = await uploadBufferToGoDaddy(key, data);
    return { url, provider: "ftp" };
  } catch (bridgeError) {
    const errorMsg = bridgeError instanceof Error ? bridgeError.message : String(bridgeError);
    logger.warn("[storage] cPanel HTTPS Bridge failed; falling back to local persistent disk", {
      key,
      error: errorMsg,
    });
    await saveFileLocally(key, data);
    const fallbackBase = env.NODE_ENV === "production" ? "https://api.hamptworthstays.com/uploads" : `http://localhost:${env.PORT}/uploads`;
    const url = publicAssetUrl(fallbackBase, key);
    logger.info("[storage] File stored successfully on local persistent disk (fallback)", { key, url, provider: "local" });
    return { url, provider: "local" };
  }
}

export async function removeFile(key: string): Promise<void> {
  assertStorageKey(key);
  logger.info("[storage] Removing file", { key });
  await removeFileLocally(key);
  await removeFileFromGoDaddy(key).catch((err) => {
    logger.warn("[storage] Remote cPanel deletion skipped or failed", { key, error: err instanceof Error ? err.message : String(err) });
  });
}

