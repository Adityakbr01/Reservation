import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../utils/app-error";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Request carrying multer's optional single file. */
export interface RequestWithFile {
  file?: Express.Multer.File;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_AVATAR_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_AVATAR_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError("Only JPEG, PNG, or WebP images are allowed", 400, "INVALID_FILE_TYPE"));
    }
  },
});

/**
 * Parses an optional single `avatar` file field into req.file.
 * Multer errors are normalized to AppError so the error contract holds.
 */
export function avatarUpload(req: Request, res: Response, next: NextFunction): void {  upload.single("avatar")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "LIMIT_FILE_SIZE"
    ) {
      next(new AppError("Avatar must be smaller than 5 MB", 400, "FILE_TOO_LARGE"));
      return;
    }
    next(error);
  });
}

const MAX_MEDIA_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_MEDIA_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "video/mp4",
  "video/webm",
]);

const mediaUploadMulter = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MEDIA_MIME.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new AppError("Only JPEG, PNG, WebP, AVIF images or MP4/WebM video are allowed", 400, "INVALID_FILE_TYPE"));
    }
  },
});

/** Parses a single `file` field for the media library (docs 08 §41-42). Images ≤8MB, video ≤50MB. */
export function mediaUpload(req: Request, res: Response, next: NextFunction): void {
  mediaUploadMulter.single("file")(req, res, (error: unknown) => {
    if (!error) {
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (file?.mimetype.startsWith("video/") && file.size > MAX_VIDEO_BYTES) {
        next(new AppError("Video must be smaller than 50 MB", 400, "FILE_TOO_LARGE"));
        return;
      }
      if (file?.mimetype.startsWith("image/") && file.size > MAX_MEDIA_BYTES) {
        next(new AppError("Image must be smaller than 8 MB", 400, "FILE_TOO_LARGE"));
        return;
      }
      next();
      return;
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "LIMIT_FILE_SIZE"
    ) {
      next(new AppError("File must be smaller than 50 MB (images 8 MB)", 400, "FILE_TOO_LARGE"));
      return;
    }
    next(error);
  });
}
