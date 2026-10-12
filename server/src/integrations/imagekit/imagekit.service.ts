import { logger } from "../../config/logger";
import { env } from "../../config/env";
import { AppError } from "../../utils/app-error";
import { getImageKit } from "./imagekit.client";
import { buildAvatarKey, publicAssetUrl } from "../storage/storage-keys";
import { removeFileFromGoDaddy, uploadBufferToGoDaddy } from "../storage/godaddy-storage";
import type { StorageProvider } from "../../modules/media/media.model";

const AVATAR_FOLDER = "reservation/avatars";

export interface UploadedAvatar {
  url: string;
  fileId: string;
  storageProvider: StorageProvider;
}

/** Uploads an avatar buffer. Provider follows STORAGE_PROVIDER. Throws 502 AppError on failure. */
export async function uploadAvatar(
  data: Buffer,
  fileName: string,
  userId: string,
): Promise<UploadedAvatar> {
  if (env.STORAGE_PROVIDER === "ftp") {
    const baseUrl = env.ASSETS_BASE_URL;
    if (!baseUrl) {
      throw new AppError("Asset storage is not configured", 503, "STORAGE_NOT_CONFIGURED");
    }
    return uploadAvatarToGoDaddy(data, fileName, userId, baseUrl);
  }
  try {
    const result = await getImageKit().upload({
      file: data,
      fileName: `${userId}-${Date.now()}-${fileName}`,
      folder: AVATAR_FOLDER,
    });
    return { url: result.url, fileId: result.fileId, storageProvider: "imagekit" };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Avatar upload failed", { message });
    throw new AppError("Avatar upload failed, please try again", 502, "MEDIA_UPLOAD_FAILED");
  }
}

async function uploadAvatarToGoDaddy(
  data: Buffer,
  fileName: string,
  userId: string,
  baseUrl: string,
): Promise<UploadedAvatar> {
  // The avatar middleware already restricts MIME; resolve the real type from magic bytes.
  const mime = sniffImageMime(data);
  const key = buildAvatarKey(userId, fileName, mime);
  try {
    await uploadBufferToGoDaddy(key, data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Avatar upload failed", { message });
    throw new AppError("Avatar upload failed, please try again", 502, "MEDIA_UPLOAD_FAILED");
  }
  return { url: publicAssetUrl(baseUrl, key), fileId: key, storageProvider: "local" };
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
 * Provider follows the stored row (coexistence-safe), defaulting to imagekit.
 */
export async function deleteAvatar(
  fileId: string,
  provider: StorageProvider = "imagekit",
): Promise<void> {
  try {
    if (provider === "local") {
      await removeFileFromGoDaddy(fileId);
    } else {
      await getImageKit().deleteFile(fileId);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Avatar cleanup failed", { message, fileId });
  }
}
