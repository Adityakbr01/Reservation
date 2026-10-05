import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { ENQUIRY_STATUSES } from "./enquiry.model";

export const createEnquirySchema = z.object({
  title: z.string().trim().max(20).nullable().optional(),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160),
  telephone: z.string().trim().min(4).max(40),
  holidayBudget: z.string().trim().max(60).nullable().optional(),
  partySize: z.number().int().min(1).max(50).nullable().optional(),
  bedrooms: z.number().int().min(0).max(20).nullable().optional(),
  fromDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  toDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  specificLocation: z.string().trim().max(200).nullable().optional(),
  dogFriendly: z.boolean().nullable().optional(),
  details: z.string().trim().max(5000).nullable().optional(),
  roomTypeId: objectIdSchema.nullable().optional(),
});

export const updateEnquiryStatusSchema = z.object({
  status: z.enum(ENQUIRY_STATUSES),
});

export const listEnquiriesQuerySchema = paginationQuerySchema.extend({
  status: z.enum(ENQUIRY_STATUSES).optional(),
  q: z.string().trim().max(80).optional(),
});

export const enquiryIdParamsSchema = z.object({ id: objectIdSchema });

export type CreateEnquiryInput = z.infer<typeof createEnquirySchema>;
