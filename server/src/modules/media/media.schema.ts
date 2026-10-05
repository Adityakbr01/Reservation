import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";

export const listMediaQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(120).optional(),
  kind: z.enum(["image", "video"]).optional(),
});

export const updateMediaSchema = z.object({
  alt: z.string().max(200).nullable().optional(),
  caption: z.string().max(300).nullable().optional(),
});

export const mediaIdParamsSchema = z.object({ id: objectIdSchema });

export type ListMediaQuery = z.infer<typeof listMediaQuerySchema>;
export type UpdateMediaInput = z.infer<typeof updateMediaSchema>;
