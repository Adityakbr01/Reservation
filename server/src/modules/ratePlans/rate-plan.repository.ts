import { prisma } from "../../config/database";
import { newId } from "../../utils/id";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import type { RatePlan, RatePlanStatus } from "./rate-plan.types";

export interface RatePlanDocLike {
  id: string;
  _id: { toString(): string };
  propertyId: string;
  roomTypeId: string;
  name: string;
  slug: string;
  description: string | null;
  pricing: any;
  restrictions: any;
  cancellationPolicyId: string | null;
  status: RatePlanStatus;
  createdAt: Date;
  updatedAt: Date;
}

export function toRatePlan(doc: any): RatePlan {
  const pricing = typeof doc.pricing === "string" ? JSON.parse(doc.pricing) : doc.pricing;
  const restrictions = typeof doc.restrictions === "string" ? JSON.parse(doc.restrictions) : doc.restrictions;
  return {
    id: doc.id ?? doc._id?.toString(),
    propertyId: typeof doc.propertyId === "object" ? doc.propertyId.toString() : doc.propertyId,
    roomTypeId: typeof doc.roomTypeId === "object" ? doc.roomTypeId.toString() : doc.roomTypeId,
    name: doc.name,
    slug: doc.slug,
    description: doc.description ?? null,
    pricing: {
      type: pricing.type,
      amount: pricing.amount,
      currency: pricing.currency,
    },
    restrictions: {
      minNights: restrictions?.minNights ?? null,
      maxNights: restrictions?.maxNights ?? null,
      minAdvanceDays: restrictions?.minAdvanceDays ?? null,
      maxAdvanceDays: restrictions?.maxAdvanceDays ?? null,
      validFrom: restrictions?.validFrom ? new Date(restrictions.validFrom) : null,
      validUntil: restrictions?.validUntil ? new Date(restrictions.validUntil) : null,
      daysOfWeek: Array.isArray(restrictions?.daysOfWeek) ? [...restrictions.daysOfWeek] : [],
    },
    cancellationPolicyId: doc.cancellationPolicyId ? doc.cancellationPolicyId.toString() : null,
    status: doc.status as RatePlanStatus,
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

export async function createRatePlan(input: CreateRatePlanInput): Promise<RatePlanDocLike> {
  const id = newId();
  const ratePlan = await prisma.ratePlan.create({
    data: {
      id,
      propertyId: input.propertyId,
      roomTypeId: input.roomTypeId,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      pricing: input.pricing as any,
      restrictions: (input.restrictions ?? {
        minNights: null,
        maxNights: null,
        minAdvanceDays: null,
        maxAdvanceDays: null,
        validFrom: null,
        validUntil: null,
        daysOfWeek: [],
      }) as any,
      cancellationPolicyId: input.cancellationPolicyId ?? null,
      status: input.status ?? "DRAFT",
    },
  });
  return {
    ...ratePlan,
    status: ratePlan.status as RatePlanStatus,
    _id: { toString: () => ratePlan.id },
  };
}

export async function findRatePlanById(id: string): Promise<RatePlan | null> {
  const doc = await prisma.ratePlan.findUnique({ where: { id } });
  return doc ? toRatePlan(doc) : null;
}

export interface ListRatePlansFilter extends PaginationQuery {
  q?: string;
  roomTypeId?: string;
  status?: RatePlanStatus;
}

export async function listRatePlans(filter: ListRatePlansFilter): Promise<Paginated<RatePlan>> {
  const { page, limit, q, roomTypeId, status } = filter;
  const where: any = {};
  if (roomTypeId) where.roomTypeId = roomTypeId;
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { slug: { contains: q } },
    ];
  }
  const [total, docs] = await Promise.all([
    prisma.ratePlan.count({ where }),
    prisma.ratePlan.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return paginatedResponse(
    docs.map(toRatePlan),
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
  try {
    const doc = await prisma.ratePlan.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.roomTypeId !== undefined ? { roomTypeId: input.roomTypeId } : {}),
        ...(input.pricing !== undefined ? { pricing: input.pricing as any } : {}),
        ...(input.restrictions !== undefined ? { restrictions: input.restrictions as any } : {}),
        ...(input.cancellationPolicyId !== undefined ? { cancellationPolicyId: input.cancellationPolicyId } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    return toRatePlan(doc);
  } catch {
    return null;
  }
}
