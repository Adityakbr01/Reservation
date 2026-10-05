import mongoose from "mongoose";
import type { QueryFilter } from "mongoose";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";

export const AMENITY_GROUPS = ["HIGHLIGHT", "FACILITY"] as const;
export type AmenityGroup = (typeof AMENITY_GROUPS)[number];
export const AMENITY_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type AmenityStatus = (typeof AMENITY_STATUSES)[number];

export interface Amenity {
  id: string;
  name: string;
  slug: string;
  group: AmenityGroup;
  description: string | null;
  imageMediaId: string | null;
  /** External icon URL (mock now, replaced with uploads later). Upload wins. */
  iconUrl: string | null;
  sortOrder: number;
  status: AmenityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface AmenityDocument extends mongoose.Document {
  name: string;
  slug: string;
  group: AmenityGroup;
  description: string | null;
  imageMediaId: string | null;
  iconUrl: string | null;
  sortOrder: number;
  status: AmenityStatus;
  createdAt: Date;
  updatedAt: Date;
}

const amenitySchema = new mongoose.Schema<AmenityDocument>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: { type: String, required: true, trim: true, maxlength: 140, unique: true },
    group: { type: String, enum: AMENITY_GROUPS, default: "HIGHLIGHT", required: true },
    description: { type: String, default: null, maxlength: 2000 },
    imageMediaId: { type: String, default: null },
    iconUrl: { type: String, default: null, maxlength: 500 },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, enum: AMENITY_STATUSES, default: "ACTIVE", required: true },
  },
  { timestamps: true },
);

amenitySchema.index({ group: 1, status: 1, sortOrder: 1 });

export const AmenityModel =
  mongoose.models.Amenity ?? mongoose.model<AmenityDocument>("Amenity", amenitySchema);

export function toAmenity(doc: AmenityDocument): Amenity {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    group: doc.group,
    description: doc.description,
    imageMediaId: doc.imageMediaId,
    iconUrl: doc.iconUrl ?? null,
    sortOrder: doc.sortOrder,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface ListAmenitiesFilter {
  page: number;
  limit: number;
  q?: string;
  group?: AmenityGroup;
  status?: AmenityStatus;
}

export async function listAmenities(filter: ListAmenitiesFilter): Promise<Paginated<Amenity>> {
  const query: QueryFilter<AmenityDocument> = {};
  if (filter.group) query.group = filter.group;
  if (filter.status) query.status = filter.status;
  if (filter.q) query.name = { $regex: filter.q, $options: "i" };
  const [total, docs] = await Promise.all([
    AmenityModel.countDocuments(query).exec(),
    AmenityModel.find(query)
      .sort({ sortOrder: 1, name: 1 })
      .skip((filter.page - 1) * filter.limit)
      .limit(filter.limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map(toAmenity),
    filter.page,
    filter.limit,
    total,
  );
}
