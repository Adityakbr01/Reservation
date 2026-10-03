import { z } from "zod";

export const createPolicySchema = z.object({
  name: z.string().trim().min(2).max(120),
  freeCancellationHours: z.number().int().min(0).max(720),
  refundPercentage: z.number().int().min(0).max(100),
  isDefault: z.boolean().optional(),
});

export const updatePolicySchema = createPolicySchema.partial();

export type CreatePolicyInput = z.infer<typeof createPolicySchema>;
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
