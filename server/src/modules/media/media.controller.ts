import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { requireUser } from "../../middleware/auth";
import type { RequestWithFile } from "../../middleware/upload";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { AppError } from "../../utils/app-error";
import { deleteMedia, listAllMedia, resolveMedia, updateMediaMeta, uploadMedia } from "./media.service";
import type { ListMediaQuery, UpdateMediaInput } from "./media.schema";

/** POST /api/v1/admin/media — multipart `file` (docs 08 §41). */
export const adminUploadMediaHandler = asyncHandler(async (req: Request, res: Response) => {
  const file = (req as Request & RequestWithFile).file;
  if (!file) {
    throw new AppError("Attach an image as the `file` field", 400, "FILE_REQUIRED");
  }
  const result = await uploadMedia({
    data: file.buffer,
    fileName: file.originalname,
    mime: file.mimetype,
    size: file.size,
    createdBy: requireUser(req).id,
  });
  res.status(201).json({ success: true, data: result });
});

/** GET /api/v1/admin/media — library list. */
export const adminListMediaHandler = asyncHandler(async (req: Request, res: Response) => {
  const query = (req as Request & RequestWithValidatedQuery).validatedQuery as ListMediaQuery;
  const result = await listAllMedia(query);
  res.status(200).json({ success: true, data: result.data, meta: result.meta });
});

/** PATCH /api/v1/admin/media/:id — alt text and caption (docs 08 §44). */
export const adminUpdateMediaHandler = asyncHandler(async (req: Request, res: Response) => {
  const result = await updateMediaMeta(req.params.id as string, req.body as UpdateMediaInput);
  res.status(200).json({ success: true, data: result });
});

/** DELETE /api/v1/admin/media/:id — blocked while referenced (docs 08 §47). */
export const adminDeleteMediaHandler = asyncHandler(async (req: Request, res: Response) => {
  await deleteMedia(req.params.id as string);
  res.status(200).json({ success: true, data: { message: "Media deleted" } });
});

/** GET /api/v1/admin/media/resolve?ids=a,b — batch URLs for editors. */
export const adminResolveMediaHandler = asyncHandler(async (req: Request, res: Response) => {
  const raw = typeof req.query.ids === "string" ? req.query.ids : "";
  const result = await resolveMedia(raw.split(",").map((id) => id.trim()).filter(Boolean));
  res.status(200).json({ success: true, data: result });
});

/** POST /api/public/media/resolve — batch URLs for renderers (no metadata leak). */
export const publicResolveMediaHandler = asyncHandler(async (req: Request, res: Response) => {
  const body = req.body as { ids?: unknown };
  const ids = Array.isArray(body.ids) ? body.ids.filter((id): id is string => typeof id === "string") : [];
  const result = await resolveMedia(ids);
  res.status(200).json({ success: true, data: result });
});
