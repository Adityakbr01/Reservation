import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { AMENITY_GROUPS, AMENITY_STATUSES } from "./amenity.model";

export const createAmenitySchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().toLowerCase().max(140).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug").optional(),
  group: z.enum(AMENITY_GROUPS).optional(),
  description: z.string().trim().max(2000).nullable().optional(),
  imageMediaId: objectIdSchema.nullable().optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
  status: z.enum(AMENITY_STATUSES).optional(),
});

export const updateAmenitySchema = createAmenitySchema.partial();

export const listAmenitiesQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  group: z.enum(AMENITY_GROUPS).optional(),
  status: z.enum(AMENITY_STATUSES).optional(),
});

export const amenityIdParamsSchema = z.object({ id: objectIdSchema });

export type CreateAmenityInput = z.infer<typeof createAmenitySchema>;
export type UpdateAmenityInput = z.infer<typeof updateAmenitySchema>;
export type ListAmenitiesQuery = z.infer<typeof listAmenitiesQuerySchema>;
