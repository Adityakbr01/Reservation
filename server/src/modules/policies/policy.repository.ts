import { CancellationPolicyModel } from "./policy.model";
import type { CancellationPolicyDocument } from "./policy.model";

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

export function toPolicy(doc: CancellationPolicyDocument): CancellationPolicy {
  return {
    id: doc._id.toString(),
    propertyId: doc.propertyId.toString(),
    name: doc.name,
    freeCancellationHours: doc.freeCancellationHours,
    refundPercentage: doc.refundPercentage,
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

export async function createPolicy(input: CreatePolicyInput): Promise<CancellationPolicyDocument> {
  if (input.isDefault) {
    await CancellationPolicyModel.updateMany(
      { propertyId: input.propertyId },
      { $set: { isDefault: false } },
    ).exec();
  }
  return CancellationPolicyModel.create(input);
}

export async function findPolicyById(id: string): Promise<CancellationPolicy | null> {
  const doc = await CancellationPolicyModel.findById(id).exec();
  return doc ? toPolicy(doc) : null;
}

export async function findDefaultPolicy(propertyId: string): Promise<CancellationPolicy | null> {
  const doc = await CancellationPolicyModel.findOne({ propertyId, isDefault: true }).exec();
  return doc ? toPolicy(doc) : null;
}

export async function listPolicies(propertyId: string): Promise<CancellationPolicy[]> {
  const docs = await CancellationPolicyModel.find({ propertyId }).sort({ createdAt: -1 }).exec();
  return docs.map((doc) => toPolicy(doc));
}

export type UpdatePolicyInput = Partial<
  Pick<CreatePolicyInput, "name" | "freeCancellationHours" | "refundPercentage" | "isDefault">
>;

export async function updatePolicyById(
  id: string,
  input: UpdatePolicyInput,
): Promise<CancellationPolicy | null> {
  if (input.isDefault) {
    const current = await CancellationPolicyModel.findById(id).select("propertyId").exec();
    if (current) {
      await CancellationPolicyModel.updateMany(
        { propertyId: current.propertyId, _id: { $ne: id } },
        { $set: { isDefault: false } },
      ).exec();
    }
  }
  const doc = await CancellationPolicyModel.findByIdAndUpdate(id, input, { new: true }).exec();
  return doc ? toPolicy(doc) : null;
}
