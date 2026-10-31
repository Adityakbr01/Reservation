import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";

const folderSchema = z
  .string()
  .trim()
  .max(200)
  .regex(/^[A-Za-z0-9 _-]+(\/[A-Za-z0-9 _-]+){0,2}$/, "Use letters, numbers, spaces, - or _, up to 3 levels")
  .nullable()
  .optional();

export const listMediaQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  kind: z.enum(["image", "video"]).optional(),
  folder: z.string().trim().max(200).optional(),
});

export const updateMediaSchema = z.object({
  alt: z.string().max(200).nullable().optional(),
  caption: z.string().max(300).nullable().optional(),
  folder: folderSchema,
});

export const uploadMediaBodySchema = z.object({
  alt: z.string().max(200).nullable().optional(),
  caption: z.string().max(300).nullable().optional(),
  folder: folderSchema,
});

export const mediaIdParamsSchema = z.object({ id: objectIdSchema });

export const reorderMediaSchema = z.object({
  items: z.array(
    z.object({
      id: objectIdSchema,
      position: z.number().int().min(0),
    }),
  ),
});

export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
export type UploadMediaBody = z.infer<typeof uploadMediaBodySchema>;
export type ReorderMediaInput = z.infer<typeof reorderMediaSchema>;
