import { prisma } from "../../config/database";
import { newId } from "../../utils/id";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import type { Coupon, CouponStatus, DiscountType } from "./coupon.types";

export interface CouponDocLike extends Coupon {
  _id: { toString(): string };
}

export function toCoupon(doc: any): Coupon {
  const applicableRoomTypeIds = Array.isArray(doc.applicableRoomTypeIds)
    ? doc.applicableRoomTypeIds
    : (typeof doc.applicableRoomTypeIds === "string" ? JSON.parse(doc.applicableRoomTypeIds) : []);
  return {
    id: doc.id ?? doc._id?.toString(),
    propertyId: typeof doc.propertyId === "object" ? doc.propertyId.toString() : doc.propertyId,
    code: doc.code,
    normalizedCode: doc.normalizedCode,
    discountType: doc.discountType as DiscountType,
    discountValue: doc.discountValue != null ? Number(doc.discountValue) : 0,
    maxDiscount: doc.maxDiscount != null ? Number(doc.maxDiscount) : null,
    minimumBookingAmount: doc.minimumBookingAmount != null ? Number(doc.minimumBookingAmount) : null,
    validFrom: doc.validFrom ? new Date(doc.validFrom) : null,
    validUntil: doc.validUntil ? new Date(doc.validUntil) : null,
    usageLimit: doc.usageLimit ?? null,
    usageCount: doc.usageCount ?? 0,
    perUserLimit: doc.perUserLimit ?? null,
    applicableRoomTypeIds: applicableRoomTypeIds.map((id: any) => id.toString()),
    status: doc.status as CouponStatus,
    createdBy: typeof doc.createdBy === "object" ? doc.createdBy?.toString() : (doc.createdBy ?? ""),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export interface CreateCouponInput {
  propertyId: string;
  code: string;
  normalizedCode: string;
  discountType: Coupon["discountType"];
  discountValue: number;
  maxDiscount?: number | null;
  minimumBookingAmount?: number | null;
  validFrom?: Date | null;
  validUntil?: Date | null;
  usageLimit?: number | null;
  perUserLimit?: number | null;
  applicableRoomTypeIds?: string[];
  status?: CouponStatus;
  createdBy: string;
}

export async function createCoupon(input: CreateCouponInput): Promise<CouponDocLike> {
  const id = newId();
  const coupon = await prisma.coupon.create({
    data: {
      id,
      propertyId: input.propertyId,
      code: input.code,
      normalizedCode: input.normalizedCode,
      discountType: input.discountType,
      discountValue: input.discountValue,
      maxDiscount: input.maxDiscount ?? null,
      minimumBookingAmount: input.minimumBookingAmount ?? null,
      validFrom: input.validFrom ?? null,
      validUntil: input.validUntil ?? null,
      usageLimit: input.usageLimit ?? null,
      usageCount: 0,
      perUserLimit: input.perUserLimit ?? null,
      applicableRoomTypeIds: (input.applicableRoomTypeIds ?? []) as any,
      status: input.status ?? "ACTIVE",
      createdBy: input.createdBy || null,
    },
  });
  return {
    ...toCoupon(coupon),
    _id: { toString: () => coupon.id },
  };
}

export async function findCouponById(id: string): Promise<Coupon | null> {
  const doc = await prisma.coupon.findUnique({ where: { id } });
  return doc ? toCoupon(doc) : null;
}

export async function findCouponByCode(propertyId: string, normalizedCode: string): Promise<Coupon | null> {
  const doc = await prisma.coupon.findFirst({
    where: { propertyId, normalizedCode },
  });
  return doc ? toCoupon(doc) : null;
}

export interface ListCouponsFilter extends PaginationQuery {
  q?: string;
  status?: CouponStatus;
}

export async function listCoupons(filter: ListCouponsFilter): Promise<Paginated<Coupon>> {
  const { page, limit, q, status } = filter;
  const where: any = {};
  if (status) where.status = status;
  if (q) {
    where.normalizedCode = { startsWith: q };
  }
  const [total, docs] = await Promise.all([
    prisma.coupon.count({ where }),
    prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);
  return paginatedResponse(
    docs.map(toCoupon),
    page,
    limit,
    total,
  );
}

export type UpdateCouponInput = Partial<
  Pick<
    CreateCouponInput,
    | "discountValue"
    | "maxDiscount"
    | "minimumBookingAmount"
    | "validFrom"
    | "validUntil"
    | "usageLimit"
    | "perUserLimit"
    | "applicableRoomTypeIds"
    | "status"
  >
>;

export async function updateCouponById(id: string, input: UpdateCouponInput): Promise<Coupon | null> {
  try {
    const doc = await prisma.coupon.update({
      where: { id },
      data: {
        ...(input.discountValue !== undefined ? { discountValue: input.discountValue } : {}),
        ...(input.maxDiscount !== undefined ? { maxDiscount: input.maxDiscount } : {}),
        ...(input.minimumBookingAmount !== undefined ? { minimumBookingAmount: input.minimumBookingAmount } : {}),
        ...(input.validFrom !== undefined ? { validFrom: input.validFrom } : {}),
        ...(input.validUntil !== undefined ? { validUntil: input.validUntil } : {}),
        ...(input.usageLimit !== undefined ? { usageLimit: input.usageLimit } : {}),
        ...(input.perUserLimit !== undefined ? { perUserLimit: input.perUserLimit } : {}),
        ...(input.applicableRoomTypeIds !== undefined ? { applicableRoomTypeIds: input.applicableRoomTypeIds as any } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
    });
    return toCoupon(doc);
  } catch {
    return null;
  }
}

/**
 * Atomically consumes one usage IFF the limit is not yet reached.
 * Returns null when exhausted (or missing) so concurrent bookings can
 * never overshoot usageLimit — checked again inside the booking txn.
 */
export async function consumeCouponUsage(id: string, _session?: unknown): Promise<Coupon | null> {
  const affected = await prisma.$executeRawUnsafe(
    "UPDATE coupons SET usageCount = usageCount + 1 WHERE id = ? AND (usageLimit IS NULL OR usageCount < usageLimit)",
    id,
  );
  if (affected === 0) return null;
  return findCouponById(id);
}
