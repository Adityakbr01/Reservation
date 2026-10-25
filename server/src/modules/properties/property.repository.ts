import { randomBytes } from "node:crypto";
import { prisma } from "../../config/database";
import type { Property } from "./property.types";

export function toProperty(doc: any): Property {
  return {
    id: doc.id ?? (doc._id ? doc._id.toString() : ""),
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? null,
    contact: doc.contact ?? null,
    mapEmbedUrl: doc.mapEmbedUrl ?? null,
    checkInTime: doc.checkInTime,
    checkOutTime: doc.checkOutTime,
    timezone: doc.timezone,
    currency: doc.currency,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export async function findProperty(): Promise<any | null> {
  const p = await prisma.property.findFirst();
  return p ? { ...p, _id: { toString: () => p.id } } : null;
}

export interface UpdatePropertyInput {
  name?: string;
  description?: string | null;
  mapEmbedUrl?: string | null;
  contact?: Partial<Property["contact"]>;
  checkInTime?: string;
  checkOutTime?: string;
  timezone?: string;
  currency?: string;
  status?: Property["status"];
}

export async function createProperty(data: { name: string; slug: string }): Promise<any> {
  const id = randomBytes(12).toString("hex");
  const p = await prisma.property.create({
    data: {
      id,
      name: data.name,
      slug: data.slug,
    },
  });
  return { ...p, _id: { toString: () => p.id } };
}

export async function updateProperty(id: string, input: UpdatePropertyInput): Promise<Property | null> {
  try {
    const doc = await prisma.property.update({
      where: { id },
      data: input,
    });
    return toProperty(doc);
  } catch {
    return null;
  }
}
