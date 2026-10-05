import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { ROOM_TYPE_STATUSES } from "./room-type.types";

const bedSchema = z.object({
  type: z.string().trim().min(1).max(60),
  quantity: z.number().int().min(1).max(20),
});

const imageSchema = z.object({
  mediaId: z.string().trim().min(1).max(120),
  altText: z.string().trim().max(160).nullable().default(null),
  sortOrder: z.number().int().min(0).default(0),
});

const mediaItemSchema = z.object({
  mediaId: z.string().trim().min(1).max(120),
  kind: z.enum(["image", "video"]).default("image"),
  altText: z.string().trim().max(160).nullable().default(null),
  sortOrder: z.number().int().min(0).default(0),
});

const seoSchema = z.object({
  title: z.string().trim().max(160).nullable().default(null),
  description: z.string().trim().max(320).nullable().default(null),
  canonicalUrl: z.string().trim().max(300).nullable().default(null),
  ogTitle: z.string().trim().max(160).nullable().default(null),
  ogDescription: z.string().trim().max(320).nullable().default(null),
  ogImage: z.string().trim().max(300).nullable().default(null),
  noIndex: z.boolean().default(false),
});

const occupancySchema = z.object({
  maxAdults: z.number().int().min(1).max(20),
  maxChildren: z.number().int().min(0).max(20),
  maxOccupancy: z.number().int().min(1).max(30),
});

export const createRoomTypeSchema = occupancySchema.extend({
  name: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Invalid slug")
    .optional(),
  shortDescription: z.string().trim().max(300).nullable().optional(),
  description: z.string().trim().max(5000).nullable().optional(),
  beds: z.array(bedSchema).max(10).optional(),
  amenities: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
  images: z.array(imageSchema).max(30).optional(),
  media: z.array(mediaItemSchema).max(30).optional(),
  layoutHtml: z.string().max(20000).nullable().optional(),
  floorplanMediaIds: z.array(objectIdSchema).max(10).optional(),
  locationText: z.string().max(5000).nullable().optional(),
  surroundingsHtml: z.string().max(20000).nullable().optional(),
  mapLat: z.number().min(-90).max(90).nullable().optional(),
  mapLng: z.number().min(-180).max(180).nullable().optional(),
  mapEmbedUrl: z.string().max(1000).nullable().optional(),
  welcomeHamperIncluded: z.boolean().optional(),
  welcomeHamperDescription: z.string().max(5000).nullable().optional(),
  welcomeHamperImageMediaId: objectIdSchema.nullable().optional(),
  amenityIds: z.array(objectIdSchema).max(100).optional(),
  bedrooms: z.number().int().min(0).max(20).nullable().optional(),
  maxDogs: z.number().int().min(0).max(10).nullable().optional(),
  status: z.enum(ROOM_TYPE_STATUSES).optional(),
  seo: seoSchema.nullable().optional(),
});

export const updateRoomTypeSchema = createRoomTypeSchema.partial();

export const listRoomTypesQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(80).optional(),
  status: z.enum(ROOM_TYPE_STATUSES).optional(),
});

export const publicRoomTypesQuerySchema = paginationQuerySchema.extend({
  guests: z.coerce.number().int().min(1).max(30).optional(),
});

export const roomTypeIdParamsSchema = z.object({ id: objectIdSchema });

export type CreateRoomTypeInput = z.infer<typeof createRoomTypeSchema>;
export type UpdateRoomTypeInput = z.infer<typeof updateRoomTypeSchema>;
export type ListRoomTypesQuery = z.infer<typeof listRoomTypesQuerySchema>;
export type PublicRoomTypesQuery = z.infer<typeof publicRoomTypesQuerySchema>;
