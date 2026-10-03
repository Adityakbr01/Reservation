import { z } from "zod";

export const searchAvailabilitySchema = z.object({
  checkIn: z.coerce.date(),
  checkOut: z.coerce.date(),
  adults: z.number().int().min(1).max(20).default(2),
  children: z.number().int().min(0).max(20).default(0),
  rooms: z.number().int().min(1).max(10).default(1),
});

export type SearchAvailabilityInput = z.infer<typeof searchAvailabilitySchema>;
