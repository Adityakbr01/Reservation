import { Readable } from "node:stream";
import { Client } from "basic-ftp";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import { assertStorageKey, parentDirOf } from "./storage-keys";

/**
 * GoDaddy cPanel FTP driver (see migrate-imagekit-to-godaddy.md).
 *
 * The FTP account (hamptworthStay@hamptworthstays.com) is jailed to
 * public_html/hamptworthstays.com/uploads.
 * Every key path (e.g. media/2026/10/file.jpg) lands at
 * public_html/hamptworthstays.com/uploads/media/2026/10/file.jpg, which is served
 * publicly at ASSETS_BASE_URL/media/2026/10/file.jpg.
 *
 * One short-lived FTPS connection per operation: uploads are admin-only and
 * low-frequency, so no pool is needed. Throws plain Errors; callers map them
 * to the stable API contract (502 MEDIA_UPLOAD_FAILED).
 */

const CONNECT_TIMEOUT_MS = 30_000;

function requireFtpConfig(): {
  host: string;
  port: number;
  user: string;
  password: string;
  secure: boolean;
} {
  const { GODADDY_FTP_HOST, GODADDY_FTP_PORT, GODADDY_FTP_USER, GODADDY_FTP_PASSWORD, GODADDY_FTP_SECURE } = env;
  if (!GODADDY_FTP_HOST || !GODADDY_FTP_USER || !GODADDY_FTP_PASSWORD) {
    throw new Error("GoDaddy FTP is not configured (GODADDY_FTP_HOST/USER/PASSWORD)");
  }
  return {
    host: GODADDY_FTP_HOST,
    port: GODADDY_FTP_PORT,
    user: GODADDY_FTP_USER,
    password: GODADDY_FTP_PASSWORD,
    secure: GODADDY_FTP_SECURE,
  };
}

/** Connect to FTP. The FTP account is already jailed to public_html/hamptworthstays.com/uploads */
async function connect(): Promise<Client> {
  const config = requireFtpConfig();
  const client = new Client(CONNECT_TIMEOUT_MS);
  await client.access({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
    secure: config.secure,
  });
  return client;
}

/** Uploads a buffer, then verifies remote size. Cleans up + throws on mismatch. */
export async function uploadBufferToGoDaddy(key: string, data: Buffer): Promise<void> {
  assertStorageKey(key);
  const fileName = key.split("/").pop() as string;
  const client = await connect(); // cwd is now uploads/
  try {
    await client.ensureDir(parentDirOf(key)); // e.g. media/2026/10
    await client.uploadFrom(Readable.from(data), fileName);
    // Integrity check: FTP cwd is now the parent dir, so size() the bare name.
    const remoteSize = await client.size(fileName);
    if (remoteSize !== data.length) {
      await client.remove(fileName).catch(() => undefined);
      throw new Error(`FTP size mismatch for ${key} (local ${data.length}, remote ${remoteSize})`);
    }
  } finally {
    client.close();
  }
}

/**
 * Best-effort removal. A missing remote file (550) is tolerated and logged —
 * callers treat it as already-gone, matching the legacy ImageKit behaviour.
 */
export async function removeFileFromGoDaddy(key: string): Promise<void> {
  assertStorageKey(key);
  const client = await connect(); // cwd is now uploads/
  try {
    await client.remove(key); // e.g. media/2026/10/file.jpg
  } catch (error) {
    if (isMissingFile(error)) {
      logger.warn("GoDaddy asset already missing, continuing", { key });
      return;
    }
    throw error;
  } finally {
    client.close();
  }
}

function isMissingFile(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  const code = (error as { code?: unknown }).code;
  if (code === 550) return true;
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("550");
}
