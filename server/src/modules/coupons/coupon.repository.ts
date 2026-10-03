import mongoose from "mongoose";
import type { QueryFilter } from "mongoose";
import type { PaginationQuery } from "../../utils/pagination";
import { paginatedResponse } from "../../utils/pagination";
import type { Paginated } from "../../utils/pagination";
import { CouponModel } from "./coupon.model";
import type { CouponDocument } from "./coupon.model";
import type { Coupon, CouponStatus } from "./coupon.types";

export function toCoupon(doc: CouponDocument): Coupon {
  return {
    id: doc._id.toString(),
    propertyId: doc.propertyId.toString(),
    code: doc.code,
    normalizedCode: doc.normalizedCode,
    discountType: doc.discountType,
    discountValue: doc.discountValue,
    maxDiscount: doc.maxDiscount,
    minimumBookingAmount: doc.minimumBookingAmount,
    validFrom: doc.validFrom,
    validUntil: doc.validUntil,
    usageLimit: doc.usageLimit,
    usageCount: doc.usageCount,
    applicableRoomTypeIds: doc.applicableRoomTypeIds.map((id) => id.toString()),
    status: doc.status,
    createdBy: doc.createdBy.toString(),
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
  applicableRoomTypeIds?: string[];
  status?: CouponStatus;
  createdBy: string;
}

export async function createCoupon(input: CreateCouponInput): Promise<CouponDocument> {
  return CouponModel.create(input);
}

export async function findCouponById(id: string): Promise<Coupon | null> {
  const doc = await CouponModel.findById(id).exec();
  return doc ? toCoupon(doc) : null;
}

export async function findCouponByCode(propertyId: string, normalizedCode: string): Promise<Coupon | null> {
  const doc = await CouponModel.findOne({ propertyId, normalizedCode }).exec();
  return doc ? toCoupon(doc) : null;
}

export interface ListCouponsFilter extends PaginationQuery {
  q?: string;
  status?: CouponStatus;
}

export async function listCoupons(filter: ListCouponsFilter): Promise<Paginated<Coupon>> {
  const { page, limit, q, status } = filter;
  const query: QueryFilter<CouponDocument> = {};
  if (status) query.status = status;
  if (q) {
    query.normalizedCode = new RegExp(`^${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, "i");
  }
  const [total, docs] = await Promise.all([
    CouponModel.countDocuments(query).exec(),
    CouponModel.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .exec(),
  ]);
  return paginatedResponse(
    docs.map((doc) => toCoupon(doc)),
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
    | "applicableRoomTypeIds"
    | "status"
  >
>;

export async function updateCouponById(id: string, input: UpdateCouponInput): Promise<Coupon | null> {
  const doc = await CouponModel.findByIdAndUpdate(id, input, { new: true }).exec();
  return doc ? toCoupon(doc) : null;
}

/**
 * Atomically consumes one usage IFF the limit is not yet reached.
 * Returns null when exhausted (or missing) so concurrent bookings can
 * never overshoot usageLimit — checked again inside the booking txn.
 */
export async function consumeCouponUsage(
  id: string,
  session?: mongoose.ClientSession,
): Promise<Coupon | null> {
  const doc = await CouponModel.findOneAndUpdate(
    {
      _id: id,
      $or: [{ usageLimit: null }, { $expr: { $lt: ["$usageCount", "$usageLimit"] } }],
    },
    { $inc: { usageCount: 1 } },
    { new: true, session },
  ).exec();
  return doc ? toCoupon(doc) : null;
}
