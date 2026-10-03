import { AppError } from "../../utils/app-error";
import { isDuplicateKeyError } from "../../utils/mongo";
import type { Paginated } from "../../utils/pagination";
import { slugify } from "../../utils/slug";
import { ensureProperty } from "../properties/property.service";
import { findRoomTypeById } from "../roomTypes/room-type.repository";
import {
  createRatePlan,
  findRatePlanById,
  listRatePlans,
  updateRatePlanById,
} from "./rate-plan.repository";
import type {
  CreateRatePlanInput,
  ListRatePlansQuery,
  UpdateRatePlanInput,
} from "./rate-plan.schema";
import type { RatePlan } from "./rate-plan.types";

function resolveSlug(name: string, slug?: string): string {
  const value = (slug ?? slugify(name)).trim();
  if (!value) {
    throw new AppError("Could not derive a slug from the name", 400, "INVALID_SLUG");
  }
  return value;
}

async function resolveRoomType(roomTypeId: string, propertyId: string): Promise<void> {
  const roomType = await findRoomTypeById(roomTypeId);
  if (!roomType || roomType.propertyId !== propertyId) {
    throw new AppError("Room type not found", 404, "ROOM_TYPE_NOT_FOUND");
  }
}

export async function createRatePlanRecord(input: CreateRatePlanInput): Promise<RatePlan> {
  const property = await ensureProperty();
  await resolveRoomType(input.roomTypeId, property.id);
  const slug = resolveSlug(input.name, input.slug);
  try {
    const doc = await createRatePlan({ ...input, propertyId: property.id, slug });
    const created = await findRatePlanById(doc._id.toString());
    if (!created) {
      throw new AppError("Rate plan could not be created", 500, "RATE_PLAN_CREATE_FAILED");
    }
    return created;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("A rate plan with this slug already exists", 409, "RATE_PLAN_EXISTS");
    }
    throw error;
  }
}

export async function getRatePlan(id: string): Promise<RatePlan> {
  const ratePlan = await findRatePlanById(id);
  if (!ratePlan) {
    throw new AppError("Rate plan not found", 404, "RATE_PLAN_NOT_FOUND");
  }
  return ratePlan;
}

export async function updateRatePlanRecord(
  id: string,
  input: UpdateRatePlanInput,
): Promise<RatePlan> {
  const current = await getRatePlan(id);
  if (input.roomTypeId) {
    await resolveRoomType(input.roomTypeId, current.propertyId);
  }
  const slug = input.slug !== undefined || input.name !== undefined
    ? resolveSlug(input.name ?? current.name, input.slug)
    : undefined;
  try {
    const updated = await updateRatePlanById(id, slug ? { ...input, slug } : input);
    if (!updated) {
      throw new AppError("Rate plan not found", 404, "RATE_PLAN_NOT_FOUND");
    }
    return updated;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("A rate plan with this slug already exists", 409, "RATE_PLAN_EXISTS");
    }
    throw error;
  }
}

export async function listRatePlanRecords(query: ListRatePlansQuery): Promise<Paginated<RatePlan>> {
  return listRatePlans(query);
}
