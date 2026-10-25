import { Prisma } from "@prisma/client";
import { prisma } from "../../config/database";
import { AppError } from "../../utils/app-error";
import { newId } from "../../utils/id";
import { isDuplicateKeyError } from "../../utils/mongo";
import { slugify } from "../../utils/slug";
import { listAmenities, toAmenity } from "./amenity.model";
import type { CreateAmenityInput, ListAmenitiesQuery, UpdateAmenityInput } from "./amenity.schema";

export async function createAmenityRecord(input: CreateAmenityInput) {
  const slug = (input.slug ?? slugify(input.name)).trim() || slugify(input.name);
  try {
    const doc = await prisma.amenity.create({
      data: {
        id: newId(),
        name: input.name,
        slug,
        group: input.group,
        description: input.description ?? null,
        imageMediaId: input.imageMediaId ?? null,
        iconUrl: input.iconUrl ?? null,
        sortOrder: input.sortOrder ?? 0,
        status: input.status ?? "ACTIVE",
      },
    });
    return toAmenity(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("Amenity slug already exists", 409, "AMENITY_EXISTS");
    throw error;
  }
}

export async function getAmenity(id: string) {
  const doc = await prisma.amenity.findUnique({ where: { id } });
  if (!doc) throw new AppError("Amenity not found", 404, "AMENITY_NOT_FOUND");
  return toAmenity(doc);
}

export async function updateAmenityRecord(id: string, input: UpdateAmenityInput) {
  try {
    const doc = await prisma.amenity.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.group !== undefined ? { group: input.group } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.imageMediaId !== undefined ? { imageMediaId: input.imageMediaId } : {}),
        ...(input.iconUrl !== undefined ? { iconUrl: input.iconUrl } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    return toAmenity(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("Amenity slug already exists", 409, "AMENITY_EXISTS");
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      throw new AppError("Amenity not found", 404, "AMENITY_NOT_FOUND");
    }
    throw error;
  }
}

export async function deleteAmenityRecord(id: string) {
  try {
    await prisma.amenity.delete({ where: { id } });
  } catch {
    // Record already deleted or not found
  }
  return { deleted: true };
}

export async function listAmenityRecords(query: ListAmenitiesQuery) {
  return listAmenities(query);
}

export async function listPublicAmenities(group?: "HIGHLIGHT" | "FACILITY") {
  const result = await listAmenities({ page: 1, limit: 200, status: "ACTIVE", ...(group ? { group } : {}) });
  return result.data;
}
