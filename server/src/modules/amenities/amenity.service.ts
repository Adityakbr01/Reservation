import { AppError } from "../../utils/app-error";
import { isDuplicateKeyError } from "../../utils/mongo";
import { slugify } from "../../utils/slug";
import { AmenityModel, listAmenities, toAmenity } from "./amenity.model";
import type { CreateAmenityInput, ListAmenitiesQuery, UpdateAmenityInput } from "./amenity.schema";

export async function createAmenityRecord(input: CreateAmenityInput) {
  const slug = (input.slug ?? slugify(input.name)).trim() || slugify(input.name);
  try {
    const doc = await AmenityModel.create({ ...input, slug });
    return toAmenity(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("Amenity slug already exists", 409, "AMENITY_EXISTS");
    throw error;
  }
}

export async function getAmenity(id: string) {
  const doc = await AmenityModel.findById(id).exec();
  if (!doc) throw new AppError("Amenity not found", 404, "AMENITY_NOT_FOUND");
  return toAmenity(doc);
}

export async function updateAmenityRecord(id: string, input: UpdateAmenityInput) {
  try {
    const doc = await AmenityModel.findByIdAndUpdate(id, input, { returnDocument: "after" }).exec();
    if (!doc) throw new AppError("Amenity not found", 404, "AMENITY_NOT_FOUND");
    return toAmenity(doc);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("Amenity slug already exists", 409, "AMENITY_EXISTS");
    throw error;
  }
}

export async function deleteAmenityRecord(id: string) {
  await AmenityModel.deleteOne({ _id: id }).exec();
  return { deleted: true };
}

export async function listAmenityRecords(query: ListAmenitiesQuery) {
  return listAmenities(query);
}

export async function listPublicAmenities(group?: "HIGHLIGHT" | "FACILITY") {
  const result = await listAmenities({ page: 1, limit: 200, status: "ACTIVE", ...(group ? { group } : {}) });
  return result.data;
}
