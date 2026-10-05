import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";

const nullableText = (max: number) => z.string().trim().max(max).nullable().optional();

export const updateSettingsSchema = z.object({
  propertyName: z.string().trim().min(2).max(120).optional(),
  logoMediaId: objectIdSchema.nullable().optional(),
  faviconMediaId: objectIdSchema.nullable().optional(),
  phone: nullableText(40),
  supportEmail: z.string().trim().email().max(160).nullable().optional(),
  address: nullableText(300),
  timezone: z.string().trim().max(60).optional(),
  currency: z.string().trim().length(3).optional(),
  checkInTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  checkOutTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  reminderHoursBefore: z.number().int().min(1).max(72).optional(),
  social: z
    .object({
      facebook: z.string().max(300).nullable().optional(),
      instagram: z.string().max(300).nullable().optional(),
      x: z.string().max(300).nullable().optional(),
    })
    .optional(),
  defaultSeo: z
    .object({
      title: z.string().max(160).nullable().optional(),
      description: z.string().max(300).nullable().optional(),
      ogImageMediaId: objectIdSchema.nullable().optional(),
    })
    .optional(),
  whyBookWithUs: z
    .array(z.object({ title: z.string().trim().min(1).max(120), text: z.string().trim().max(5000).nullable().optional() }))
    .max(10)
    .optional(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
