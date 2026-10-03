import type { QueryFilter } from "mongoose";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { RatePlanModel } from "./rate-plan.model";
import type { RatePlanDocument } from "./rate-plan.model";
import type { RatePlan, RatePlanStatus } from "./rate-plan.types";

export function toRatePlan(doc: RatePlanDocument): RatePlan {
  return {
    id: doc._id.toString(),
    propertyId: doc.propertyId.toString(),
    roomTypeId: doc.roomTypeId.toString(),
    name: doc.name,
    slug: doc.slug,
    description: doc.description,
    pricing: {
      type: doc.pricing.type,
      amount: doc.pricing.amount,
      currency: doc.pricing.currency,
    },
    restrictions: {
      minNights: doc.restrictions.minNights,
      maxNights: doc.restrictions.maxNights,
      minAdvanceDays: doc.restrictions.minAdvanceDays,
      maxAdvanceDays: doc.restrictions.maxAdvanceDays,
      validFrom: doc.restrictions.validFrom,
      validUntil: doc.restrictions.validUntil,
      daysOfWeek: [...doc.restrictions.daysOfWeek],
    },
    cancellationPolicyId: doc.cancellationPolicyId ? doc.cancellationPolicyId.toString() : null,
    status: doc.status,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreateRatePlanInput {
  propertyId: string;
  roomTypeId: string;
  name: string;
  slug: string;
  description?: string | null;
  pricing: RatePlan["pricing"];
  restrictions?: Partial<RatePlan["restrictions"]>;
  cancellationPolicyId?: string | null;
  status?: RatePlanStatus;
}

export async function createRatePlan(input: CreateRatePlanInput): Promise<RatePlanDocument> {
  return RatePlanModel.create(input);
}

export async function findRatePlanById(id: string): Promise<RatePlan | null> {
  const doc = await RatePlanModel.findById(id).exec();
  return doc ? toRatePlan(doc) : null;
}

export interface ListRatePlansFilter extends PaginationQuery {
  q?: string;
  roomTypeId?: string;
  status?: RatePlanStatus;
}

export async function listRatePlans(filter: ListRatePlansFilter): Promise<Paginated<RatePlan>> {
  const { page, limit, q, roomTypeId, status } = filter;
  const query: QueryFilter<RatePlanDocument> = {};
  if (roomTypeId) query.roomTypeId = roomTypeId;
  if (status) query.status = status;
  if (q) {
    const pattern = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    query.$or = [{ name: pattern }, { slug: pattern }];
  }
  const [total, docs] = await Promise.all([
    RatePlanModel.countDocuments(query).exec(),
    RatePlanModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map((doc) => toRatePlan(doc)),
    page,
    limit,
    total,
  );
}

export type UpdateRatePlanInput = Partial<
  Pick<
    CreateRatePlanInput,
    | "name"
    | "slug"
    | "description"
    | "pricing"
    | "restrictions"
    | "cancellationPolicyId"
    | "status"
  >
> & { roomTypeId?: string };

export async function updateRatePlanById(
  id: string,
  input: UpdateRatePlanInput,
): Promise<RatePlan | null> {
  const doc = await RatePlanModel.findByIdAndUpdate(id, input, { new: true }).exec();
  return doc ? toRatePlan(doc) : null;
}
