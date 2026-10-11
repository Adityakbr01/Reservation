import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";

const dateSchema = z.coerce.date();

export const createBlockSchema = z
  .object({
    roomId: objectIdSchema.optional(),
    roomTypeId: objectIdSchema.optional(),
    startDate: dateSchema,
    endDate: dateSchema,
    reason: z.string().trim().max(300).nullable().optional(),
  })
  .refine((data) => Boolean(data.roomId || data.roomTypeId), {
    message: "Either roomId or roomTypeId must be provided",
  });

export const listBlocksQuerySchema = paginationQuerySchema.extend({
  roomId: objectIdSchema.optional(),
  roomTypeId: objectIdSchema.optional(),
  from: dateSchema.optional(),
  to: dateSchema.optional(),
});

export const blockIdParamsSchema = z.object({ id: objectIdSchema });

export const calendarQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roomTypeId: objectIdSchema.optional(),
});

export type CalendarQuery = z.infer<typeof calendarQuerySchema>;

export type CreateBlockInput = z.infer<typeof createBlockSchema>;
export type ListBlocksQuery = z.infer<typeof listBlocksQuerySchema>;
