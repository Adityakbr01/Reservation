import { prisma } from "../../config/database";
import { newId } from "../../utils/id";

export interface CancellationPolicy {
  id: string;
  propertyId: string;
  name: string;
  freeCancellationHours: number;
  refundPercentage: number;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CancellationPolicyDocLike extends CancellationPolicy {
  _id: { toString(): string };
}

export function toPolicy(doc: any): CancellationPolicy {
  return {
    id: doc.id ?? doc._id?.toString(),
    propertyId: typeof doc.propertyId === "object" ? doc.propertyId.toString() : doc.propertyId,
    name: doc.name,
    freeCancellationHours: doc.freeCancellationHours,
    refundPercentage: doc.refundPercentage != null ? Number(doc.refundPercentage) : 0,
    isDefault: doc.isDefault,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreatePolicyInput {
  propertyId: string;
  name: string;
  freeCancellationHours: number;
  refundPercentage: number;
  isDefault?: boolean;
}

export async function createPolicy(input: CreatePolicyInput): Promise<CancellationPolicyDocLike> {
  if (input.isDefault) {
    await prisma.cancellationPolicy.updateMany({
      where: { propertyId: input.propertyId },
      data: { isDefault: false },
    });
  }
  const id = newId();
  const policy = await prisma.cancellationPolicy.create({
    data: {
      id,
      propertyId: input.propertyId,
      name: input.name,
      freeCancellationHours: input.freeCancellationHours,
      refundPercentage: input.refundPercentage,
      isDefault: input.isDefault ?? false,
    },
  });
  return {
    ...toPolicy(policy),
    _id: { toString: () => policy.id },
  };
}

export async function findPolicyById(id: string): Promise<CancellationPolicy | null> {
  const doc = await prisma.cancellationPolicy.findUnique({ where: { id } });
  return doc ? toPolicy(doc) : null;
}

export async function findDefaultPolicy(propertyId: string): Promise<CancellationPolicy | null> {
  const doc = await prisma.cancellationPolicy.findFirst({
    where: { propertyId, isDefault: true },
  });
  return doc ? toPolicy(doc) : null;
}

export async function listPolicies(propertyId: string): Promise<CancellationPolicy[]> {
  const docs = await prisma.cancellationPolicy.findMany({
    where: { propertyId },
    orderBy: { createdAt: "desc" },
  });
  return docs.map(toPolicy);
}

export type UpdatePolicyInput = Partial<
  Pick<CreatePolicyInput, "name" | "freeCancellationHours" | "refundPercentage" | "isDefault">
>;

export async function updatePolicyById(
  id: string,
  input: UpdatePolicyInput,
): Promise<CancellationPolicy | null> {
  if (input.isDefault) {
    const current = await prisma.cancellationPolicy.findUnique({
      where: { id },
      select: { propertyId: true },
    });
    if (current) {
      await prisma.cancellationPolicy.updateMany({
        where: { propertyId: current.propertyId, NOT: { id } },
        data: { isDefault: false },
      });
    }
  }
  try {
    const doc = await prisma.cancellationPolicy.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.freeCancellationHours !== undefined ? { freeCancellationHours: input.freeCancellationHours } : {}),
        ...(input.refundPercentage !== undefined ? { refundPercentage: input.refundPercentage } : {}),
        ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
      },
    });
    return toPolicy(doc);
  } catch {
    return null;
  }
}
