import { prisma } from "../../config/database";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import type { Amenity as PrismaAmenity } from "@prisma/client";

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

export function toAmenity(doc: PrismaAmenity | any): Amenity {
  return {
    id: doc.id ?? doc._id?.toString(),
    name: doc.name,
    slug: doc.slug,
    group: doc.group as AmenityGroup,
    description: doc.description ?? null,
    imageMediaId: doc.imageMediaId ?? null,
    iconUrl: doc.iconUrl ?? null,
    sortOrder: doc.sortOrder ?? 0,
    status: doc.status as AmenityStatus,
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
  const where: any = {};
  if (filter.group) where.group = filter.group;
  if (filter.status) where.status = filter.status;
  if (filter.q) {
    where.name = { contains: filter.q };
  }
  const [total, docs] = await Promise.all([
    prisma.amenity.count({ where }),
    prisma.amenity.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      skip: (filter.page - 1) * filter.limit,
      take: filter.limit,
    }),
  ]);
  return paginatedResponse(
    docs.map(toAmenity),
    filter.page,
    filter.limit,
    total,
  );
}
