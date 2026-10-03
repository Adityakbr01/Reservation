import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";

export const createIntentSchema = z.object({
  bookingId: objectIdSchema,
});

export const paymentIdParamsSchema = z.object({ id: objectIdSchema });

export type CreateIntentInput = z.infer<typeof createIntentSchema>;
