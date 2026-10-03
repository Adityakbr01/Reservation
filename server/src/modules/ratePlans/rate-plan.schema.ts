import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { PRICING_TYPES, RATE_PLAN_STATUSES } from "./rate-plan.types";

const pricingSchema = z.object({
  type: z.enum(PRICING_TYPES).default("PER_NIGHT"),
  amount: z.number().int().min(0),
  currency: z.string().trim().length(3).default("INR"),
});

const restrictionsSchema = z.object({
  minNights: z.number().int().min(1).nullable().optional(),
  maxNights: z.number().int().min(1).nullable().optional(),
  minAdvanceDays: z.number().int().min(0).nullable().optional(),
  maxAdvanceDays: z.number().int().min(0).nullable().optional(),
  validFrom: z.coerce.date().nullable().optional(),
  validUntil: z.coerce.date().nullable().optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).max(7).optional(),
});

export const createRatePlanSchema = z.object({
  roomTypeId: objectIdSchema,
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug")
    .optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  pricing: pricingSchema,
  restrictions: restrictionsSchema.optional(),
  cancellationPolicyId: objectIdSchema.nullable().optional(),
  status: z.enum(RATE_PLAN_STATUSES).optional(),
});

export const updateRatePlanSchema = createRatePlanSchema.partial();

export const listRatePlansQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  roomTypeId: objectIdSchema.optional(),
  status: z.enum(RATE_PLAN_STATUSES).optional(),
});

export const ratePlanIdParamsSchema = z.object({ id: objectIdSchema });

export type CreateRatePlanInput = z.infer<typeof createRatePlanSchema>;
export type UpdateRatePlanInput = z.infer<typeof updateRatePlanSchema>;
export type ListRatePlansQuery = z.infer<typeof listRatePlansQuerySchema>;
