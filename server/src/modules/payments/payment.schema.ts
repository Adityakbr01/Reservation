import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { PAYMENT_STATUSES } from "../bookings/booking.types";

export const createIntentSchema = z.object({
  bookingId: objectIdSchema,
});

export const paymentIdParamsSchema = z.object({ id: objectIdSchema });

export const adminPaymentsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(PAYMENT_STATUSES).optional(),
  bookingId: objectIdSchema.optional(),
});

export type CreateIntentInput = z.infer<typeof createIntentSchema>;
export type AdminPaymentsQuery = z.infer<typeof adminPaymentsQuerySchema>;
