import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";

export const quoteRequestSchema = z.object({
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  roomTypeId: objectIdSchema,
  ratePlanId: objectIdSchema,
  quantity: z.number().int().min(1).max(10).default(1),
  couponCode: z.string().trim().min(1).max(40).optional(),
});

export type QuoteRequest = z.infer<typeof quoteRequestSchema>;
