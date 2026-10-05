import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";

const dayPriceSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  price: z.number().min(0).max(100_000_000),
});

export const upsertDailyPricesSchema = z.object({
  prices: z.array(dayPriceSchema).min(1).max(62),
  currency: z.string().trim().length(3).optional(),
});

export const listDailyPricesQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const ratePlanPriceParamsSchema = z.object({ id: objectIdSchema });

export type UpsertDailyPricesInput = z.infer<typeof upsertDailyPricesSchema>;
export type ListDailyPricesQuery = z.infer<typeof listDailyPricesQuerySchema>;
