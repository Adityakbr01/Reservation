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
export function avatarUpload(req: Request, res: Response, next: NextFunction): void {
  upload.single("avatar")(req, res, (error: unknown) => {
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
