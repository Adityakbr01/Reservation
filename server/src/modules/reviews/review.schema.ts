import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { REVIEW_STATUSES } from "./review.model";

export const createReviewSchema = z.object({
  roomTypeId: objectIdSchema,
  bookingId: objectIdSchema.nullable().optional(),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().max(160).nullable().optional(),
  body: z.string().trim().min(4).max(5000),
  stayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
});

export const adminCreateReviewSchema = createReviewSchema.extend({
  authorName: z.string().trim().min(1).max(120),
  isVerified: z.boolean().optional(),
  status: z.enum(REVIEW_STATUSES).optional(),
});

export const moderateReviewSchema = z.object({
  status: z.enum(REVIEW_STATUSES),
});

export const listReviewsQuerySchema = paginationQuerySchema.extend({
  roomTypeId: objectIdSchema.optional(),
  status: z.enum(REVIEW_STATUSES).optional(),
});

export const publicListReviewsQuerySchema = paginationQuerySchema.extend({
  roomTypeId: objectIdSchema,
});

export const reviewIdParamsSchema = z.object({ id: objectIdSchema });

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
