import { z } from "zod";
import { PROPERTY_STATUSES } from "./property.types";

const contactSchema = z.object({
  email: z.string().trim().email().max(160).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(200).nullable().optional(),
  city: z.string().trim().max(80).nullable().optional(),
  state: z.string().trim().max(80).nullable().optional(),
  country: z.string().trim().max(80).nullable().optional(),
  postalCode: z.string().trim().max(20).nullable().optional(),
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Expected HH:MM");

export const updatePropertySchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  contact: contactSchema.optional(),
  checkInTime: timeSchema.optional(),
  checkOutTime: timeSchema.optional(),
  timezone: z.string().trim().max(60).optional(),
  currency: z.string().trim().length(3).optional(),
  status: z.enum(PROPERTY_STATUSES).optional(),
});

export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;
