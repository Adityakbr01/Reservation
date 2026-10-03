import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";

const dateSchema = z.coerce.date();

export const createBlockSchema = z.object({
  roomId: objectIdSchema,
  startDate: dateSchema,
  endDate: dateSchema,
  reason: z.string().trim().max(300).nullable().optional(),
});

export const listBlocksQuerySchema = paginationQuerySchema.extend({
  roomId: objectIdSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const blockIdParamsSchema = z.object({ id: objectIdSchema });

export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type ListBlocksQuery = z.infer<typeof listBlocksQuerySchema>;
