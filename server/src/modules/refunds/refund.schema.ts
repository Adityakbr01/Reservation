import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { REFUND_STATUSES } from "./refund.model";

export const adminRefundsQuerySchema = paginationQuerySchema.extend({
  bookingId: objectIdSchema.optional(),
  status: z.enum(REFUND_STATUSES).optional(),
});

export type AdminRefundsQuery = z.infer<typeof adminRefundsQuerySchema>;
