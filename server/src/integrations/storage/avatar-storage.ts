import { logger } from "../../config/logger";
import { AppError } from "../../utils/app-error";
import { buildAvatarKey } from "./storage-keys";
import { removeFile, uploadBuffer } from "./godaddy-storage";
import type { StorageProvider } from "../../modules/media/media.model";

export interface UploadedAvatar {
  url: string;
  fileId: string;
  storageProvider: StorageProvider;
}

/** Uploads an avatar buffer with automatic FTP or local persistent storage. */
export async function uploadAvatar(
  data: Buffer,
  fileName: string,
  userId: string,
): Promise<UploadedAvatar> {
  const mime = sniffImageMime(data);
  const key = buildAvatarKey(userId, fileName, mime);
  try {
    const result = await uploadBuffer(key, data);
    return { url: result.url, fileId: key, storageProvider: result.provider };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Avatar upload failed", { message });
    throw new AppError("Avatar upload failed, please try again", 502, "MEDIA_UPLOAD_FAILED");
  }
}

/** Minimal magic-byte sniff for the avatar allow-list (JPEG/PNG/WebP). Falls back to JPEG. */
function sniffImageMime(data: Buffer): "image/jpeg" | "image/png" | "image/webp" {
  if (data.length >= 8 && data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47) {
    return "image/png";
  }
  if (
    data.length >= 12 &&
    data[0] === 0x52 &&
    data[1] === 0x49 &&
    data[2] === 0x46 &&
    data[3] === 0x46 &&
    data[8] === 0x57 &&
    data[9] === 0x45 &&
    data[10] === 0x42 &&
    data[11] === 0x50
  ) {
    return "image/webp";
  }
  return "image/jpeg";
}

/**
 * Best-effort removal of a replaced avatar. Orphans never break requests.
 */
export async function deleteAvatar(fileId: string): Promise<void> {
  try {
    await removeFile(fileId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Avatar cleanup failed", { message, fileId });
  }
}
