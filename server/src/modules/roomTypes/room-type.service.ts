import { AppError } from "../../utils/app-error";
import { isDuplicateKeyError } from "../../utils/mongo";
import type { Paginated } from "../../utils/pagination";
import { slugify } from "../../utils/slug";
import { sanitizeRichText } from "../cms/cms.types";
import { ensureProperty } from "../properties/property.service";
import {
  createRoomType,
  findRoomTypeById,
  findRoomTypeBySlug,
  listRoomTypes,
  updateRoomTypeById,
} from "./room-type.repository";
import type { CreateRoomTypeInput, ListRoomTypesQuery, UpdateRoomTypeInput } from "./room-type.schema";
import type { PublicRoomTypesQuery } from "./room-type.schema";
import type { RoomType } from "./room-type.types";

function resolveSlug(name: string, slug?: string): string {
  const value = (slug ?? slugify(name)).trim();
  if (!value) {
    throw new AppError("Could not derive a slug from the name", 400, "INVALID_SLUG");
  }
  return value;
}

/** Rich HTML fields (CKEditor) are sanitized like CMS content before storage. */
function sanitizeHtmlFields<T extends Record<string, unknown>>(input: T): T {
  const out: Record<string, unknown> = { ...input };
  const html = (v: unknown): string | null =>
    typeof v === "string" && v.trim() ? sanitizeRichText(v) || null : null;
  if ("propertyDetailsHtml" in input) out.propertyDetailsHtml = html(input.propertyDetailsHtml);
  if ("layoutHtml" in input) out.layoutHtml = html(input.layoutHtml);
  if ("surroundingsHtml" in input) out.surroundingsHtml = html(input.surroundingsHtml);
  if ("welcomeHamperHtml" in input) out.welcomeHamperHtml = html(input.welcomeHamperHtml);
  return out as T;
}

export async function createRoomTypeRecord(input: CreateRoomTypeInput): Promise<RoomType> {
  const property = await ensureProperty();
  const slug = resolveSlug(input.name, input.slug);
  try {
    const doc = await createRoomType({ ...sanitizeHtmlFields(input), propertyId: property.id, slug });
    const created = await findRoomTypeById(doc._id.toString());
    if (!created) {
      throw new AppError("Room type could not be created", 500, "ROOM_TYPE_CREATE_FAILED");
    }
    return created;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("A room type with this slug already exists", 409, "ROOM_TYPE_EXISTS");
    }
    throw error;
  }
}

export async function getRoomType(id: string): Promise<RoomType> {
  const roomType = await findRoomTypeById(id);
  if (!roomType) {
    throw new AppError("Room type not found", 404, "ROOM_TYPE_NOT_FOUND");
  }
  return roomType;
}

export async function updateRoomTypeRecord(id: string, input: UpdateRoomTypeInput): Promise<RoomType> {
  const current = await getRoomType(id);
  const slug = input.slug !== undefined || input.name !== undefined
    ? resolveSlug(input.name ?? current.name, input.slug)
    : undefined;
  try {
    const safeInput = sanitizeHtmlFields(input);
    const updated = await updateRoomTypeById(id, slug ? { ...safeInput, slug } : safeInput);
    if (!updated) {
      throw new AppError("Room type not found", 404, "ROOM_TYPE_NOT_FOUND");
    }
    return updated;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("A room type with this slug already exists", 409, "ROOM_TYPE_EXISTS");
    }
    throw error;
  }
}

export async function listRoomTypeRecords(query: ListRoomTypesQuery): Promise<Paginated<RoomType>> {
  return listRoomTypes(query);
}

/** Public catalog: ACTIVE types only. Date filtering arrives with availability. */
export async function listPublicRoomTypes(query: PublicRoomTypesQuery): Promise<Paginated<RoomType>> {
  return listRoomTypes({
    page: query.page,
    limit: query.limit,
    onlyActive: true,
    minOccupancy: query.guests,
  });
}

export async function getPublicRoomType(slug: string): Promise<RoomType & { totalRooms?: number }> {
  const property = await ensureProperty();
  const roomType = await findRoomTypeBySlug(property.id, slug);
  if (!roomType || roomType.status !== "ACTIVE") {
    throw new AppError("Room type not found", 404, "ROOM_TYPE_NOT_FOUND");
  }
  const { countActiveRoomsByRoomTypeId } = await import("../rooms/room.repository");
  const totalRooms = await countActiveRoomsByRoomTypeId(roomType.id);
  return { ...roomType, totalRooms: Math.max(1, totalRooms) };
}
