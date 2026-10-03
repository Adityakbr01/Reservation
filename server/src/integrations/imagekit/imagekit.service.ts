import { logger } from "../../config/logger";
import { AppError } from "../../utils/app-error";
import { getImageKit } from "./imagekit.client";

const AVATAR_FOLDER = "reservation/avatars";

export interface UploadedAvatar {
  url: string;
  fileId: string;
}

/** Uploads an avatar buffer to ImageKit. Throws 502 AppError on failure. */
export async function uploadAvatar(
  data: Buffer,
  fileName: string,
  userId: string,
): Promise<UploadedAvatar> {
  try {
    const result = await getImageKit().upload({
      file: data,
      fileName: `${userId}-${Date.now()}-${fileName}`,
      folder: AVATAR_FOLDER,
    });
    return { url: result.url, fileId: result.fileId };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Avatar upload failed", { message });
    throw new AppError("Avatar upload failed, please try again", 502, "MEDIA_UPLOAD_FAILED");
  }
}

/** Best-effort removal of a replaced avatar. Orphans never break requests. */
export async function deleteAvatar(fileId: string): Promise<void> {
  try {
    await getImageKit().deleteFile(fileId);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn("Avatar cleanup failed", { message, fileId });
  }
}
