import type { Request, Response } from "express";
import { asyncHandler } from "../../utils/async-handler";
import { requireUser } from "../../middleware/auth";
import type { RequestWithFile, RequestWithFiles } from "../../middleware/upload";
import type { RequestWithValidatedQuery } from "../../middleware/validate";
import { AppError } from "../../utils/app-error";
import { deleteMedia, listAllMedia, resolveMedia, updateMediaMeta, uploadMedia } from "./media.service";
import { listMediaFolders } from "./media.model";
import type { ListMediaQuery, UpdateMediaInput, UploadMediaBody } from "./media.schema";

/**
 * POST /api/v1/admin/media — multipart `file` (single) or `files` (up to 10)
 * plus optional text `folder` (docs 08 §41). Always returns an array so
 * multi-upload needs no second call shape.
 */
export const adminUploadMediaHandler = asyncHandler(async (req: Request, res: Response) => {
  const single = (req as Request & RequestWithFile).file;
  const grouped = (req as Request & RequestWithFiles).files;
  const files: Express.Multer.File[] = [
    ...(single ? [single] : []),
    ...(Array.isArray(grouped) ? grouped : [...(grouped?.file ?? []), ...(grouped?.files ?? [])]),
  ];
  if (files.length === 0) {
    throw new AppError("Attach files with the `file` or `files` field", 400, "FILE_REQUIRED");
  }
  const body = (req.body ?? {}) as UploadMediaBody;
  const userId = requireUser(req).id;
  const results = [];
  for (const file of files) {
    results.push(
      await uploadMedia({
        data: file.buffer,
        fileName: file.originalname,
        mime: file.mimetype,
        size: file.size,
        folder: body.folder ?? null,
        createdBy: userId,
      }),
    );
  }
  res.status(201).json({ success: true, data: results });
});

/** GET /api/v1/admin/media/folders — distinct folder paths for the sidebar. */
export const adminListFoldersHandler = asyncHandler(async (_req: Request, res: Response) => {
  const result = await listMediaFolders();
  res.status(200).json({ success: true, data: result });
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
