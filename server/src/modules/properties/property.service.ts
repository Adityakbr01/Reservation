import { logger } from "../../config/logger";
import { AppError } from "../../utils/app-error";
import { findProperty, toProperty, updateProperty } from "./property.repository";
import type { UpdatePropertyInput } from "./property.repository";
import { PropertyModel } from "./property.model";
import type { Property } from "./property.types";

/**
 * Single-property invariant: exactly one property document exists.
 * Created with operational defaults on first need (boot seed); staff
 * refine it through the admin update endpoint afterwards.
 */
export async function ensureProperty(): Promise<Property> {
  const existing = await findProperty();
  if (existing) return toProperty(existing);
  const doc = await PropertyModel.create({ name: "My Hotel", slug: "main-property" });
  logger.info("Property seeded with defaults");
  return toProperty(doc);
}

export async function getProperty(): Promise<Property | null> {
  const doc = await findProperty();
  return doc ? toProperty(doc) : null;
}

export async function updatePropertyDetails(input: UpdatePropertyInput): Promise<Property> {
  const current = await ensureProperty();
  const updated = await updateProperty(current.id, input);
  if (!updated) {
    throw new AppError("Property not found", 404, "PROPERTY_NOT_FOUND");
  }
  return updated;
}
