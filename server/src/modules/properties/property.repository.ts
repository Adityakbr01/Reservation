import { PropertyModel } from "./property.model";
import type { PropertyDocument } from "./property.model";
import type { Property } from "./property.types";

export function toProperty(doc: PropertyDocument): Property {
  return {
    id: doc._id.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    contact: doc.contact,
    checkInTime: doc.checkInTime,
    checkOutTime: doc.checkOutTime,
    timezone: doc.timezone,
    currency: doc.currency,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function findProperty(): Promise<PropertyDocument | null> {
  return PropertyModel.findOne().exec();
}

export interface UpdatePropertyInput {
  name?: string;
  description?: string | null;
  contact?: Partial<Property["contact"]>;
  checkInTime?: string;
  checkOutTime?: string;
  timezone?: string;
  currency?: string;
  status?: Property["status"];
}

export async function updateProperty(id: string, input: UpdatePropertyInput): Promise<Property | null> {
  const doc = await PropertyModel.findByIdAndUpdate(id, input, { new: true }).exec();
  return doc ? toProperty(doc) : null;
}
