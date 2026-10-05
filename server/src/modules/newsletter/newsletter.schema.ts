import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { NEWSLETTER_STATUSES } from "./newsletter.model";

export const subscribeSchema = z.object({
  email: z.string().trim().email().max(160),
  name: z.string().trim().max(120).nullable().optional(),
  source: z.string().trim().max(40).nullable().optional(),
});

export const listSubscribersQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  status: z.enum(NEWSLETTER_STATUSES).optional(),
});

export const subscriberIdParamsSchema = z.object({ id: objectIdSchema });

export type SubscribeInput = z.infer<typeof subscribeSchema>;
