import type { QueryFilter } from "mongoose";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { RoomTypeModel } from "./room-type.model";
import type { RoomTypeDocument } from "./room-type.model";
import type { RoomType, RoomTypeStatus } from "./room-type.types";

export function toRoomType(doc: RoomTypeDocument): RoomType {
  return {
    id: doc._id.toString(),
    propertyId: doc.propertyId.toString(),
    name: doc.name,
    slug: doc.slug,
    shortDescription: doc.shortDescription,
    description: doc.description,
    maxAdults: doc.maxAdults,
    maxChildren: doc.maxChildren,
    maxOccupancy: doc.maxOccupancy,
    beds: doc.beds.map((bed) => ({ type: bed.type, quantity: bed.quantity })),
    amenities: [...doc.amenities],
    images: doc.images.map((image) => ({
      mediaId: image.mediaId,
      altText: image.altText,
      sortOrder: image.sortOrder,
    })),
    status: doc.status,
    seo: doc.seo,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreateRoomTypeInput {
  propertyId: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  maxAdults: number;
  maxChildren: number;
  maxOccupancy: number;
  beds?: RoomType["beds"];
  amenities?: string[];
  images?: RoomType["images"];
  status?: RoomTypeStatus;
  seo?: RoomType["seo"];
}

export async function createRoomType(input: CreateRoomTypeInput): Promise<RoomTypeDocument> {
  return RoomTypeModel.create(input);
}

export async function findRoomTypeById(id: string): Promise<RoomType | null> {
  const doc = await RoomTypeModel.findById(id).exec();
  return doc ? toRoomType(doc) : null;
}

export async function findRoomTypeDocById(id: string): Promise<RoomTypeDocument | null> {
  return RoomTypeModel.findById(id).exec();
}

export async function findRoomTypeBySlug(propertyId: string, slug: string): Promise<RoomType | null> {
  const doc = await RoomTypeModel.findOne({ propertyId, slug }).exec();
  return doc ? toRoomType(doc) : null;
}

export interface ListRoomTypesFilter extends PaginationQuery {
  q?: string;
  status?: RoomTypeStatus;
  onlyActive?: boolean;
  minOccupancy?: number;
}

export async function listRoomTypes(filter: ListRoomTypesFilter): Promise<Paginated<RoomType>> {
  const { page, limit, q, status, onlyActive, minOccupancy } = filter;
  const query: QueryFilter<RoomTypeDocument> = {};
  if (onlyActive) {
    query.status = "ACTIVE";
  } else if (status) {
    query.status = status;
  }
  if (minOccupancy !== undefined) {
    query.maxOccupancy = { $gte: minOccupancy };
  }
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: pattern }, { slug: pattern }];
  }
  const [total, docs] = await Promise.all([
    RoomTypeModel.countDocuments(query).exec(),
    RoomTypeModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map((doc) => toRoomType(doc)),
    page,
    limit,
    total,
  );
}

export type UpdateRoomTypeInput = Partial<
  Pick<
    CreateRoomTypeInput,
    | "name"
    | "slug"
    | "shortDescription"
    | "description"
    | "maxAdults"
    | "maxChildren"
    | "maxOccupancy"
    | "beds"
    | "amenities"
    | "images"
    | "status"
    | "seo"
  >
>;

export async function updateRoomTypeById(
  id: string,
  input: UpdateRoomTypeInput,
): Promise<RoomType | null> {
  const doc = await RoomTypeModel.findByIdAndUpdate(id, input, { returnDocument: "after" }).exec();
  return doc ? toRoomType(doc) : null;
}
