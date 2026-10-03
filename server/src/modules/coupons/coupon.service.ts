import { AppError } from "../../utils/app-error";
import { isDuplicateKeyError } from "../../utils/mongo";
import { applyDiscount } from "../../utils/money";
import type { Paginated } from "../../utils/pagination";
import { ensureProperty } from "../properties/property.service";
import { findRoomTypeById } from "../roomTypes/room-type.repository";
import {
  createCoupon,
  findCouponByCode,
  findCouponById,
  listCoupons,
  updateCouponById,
} from "./coupon.repository";
import type {
  CreateCouponInput,
  ListCouponsQuery,
  UpdateCouponInput,
  ValidateCouponInput,
} from "./coupon.schema";
import type { Coupon } from "./coupon.types";

export interface CouponEvaluation {
  valid: boolean;
  code: string;
  reason?: string;
  /** Present whenever the coupon record exists (even when unusable). */
  couponId?: string;
  discountType?: Coupon["discountType"];
  discountValue?: number;
  /** Minor units. Zero when invalid or when no subtotal was supplied. */
  discount: number;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase();
}

/**
 * Single source of truth for coupon checks, shared by the public validate
 * endpoint and the quote flow. Never consumes usage — booking does that
 * (Phase 6) so validation stays side-effect free.
 */
export async function evaluateCoupon(
  propertyId: string,
  code: string,
  options: { roomTypeId?: string; subtotal?: number } = {},
): Promise<CouponEvaluation> {
  const normalizedCode = normalizeCode(code);
  const coupon = await findCouponByCode(propertyId, normalizedCode);
  if (!coupon) {
    return { valid: false, code: normalizedCode, reason: "COUPON_INVALID", discount: 0 };
  }
  const now = new Date();
  if (coupon.status !== "ACTIVE") {
    return {
      valid: false,
      code: normalizedCode,
      couponId: coupon.id,
      reason: coupon.status === "EXPIRED" ? "COUPON_EXPIRED" : "COUPON_INACTIVE",
      discount: 0,
    };
  }
  if ((coupon.validFrom && coupon.validFrom.getTime() > now.getTime()) ||
    (coupon.validUntil && coupon.validUntil.getTime() < now.getTime())) {
    return { valid: false, code: normalizedCode, couponId: coupon.id, reason: "COUPON_EXPIRED", discount: 0 };
  }
  if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
    return { valid: false, code: normalizedCode, couponId: coupon.id, reason: "COUPON_LIMIT_REACHED", discount: 0 };
  }
  if (options.roomTypeId && coupon.applicableRoomTypeIds.length > 0 &&
    !coupon.applicableRoomTypeIds.includes(options.roomTypeId)) {
    return { valid: false, code: normalizedCode, couponId: coupon.id, reason: "COUPON_NOT_APPLICABLE", discount: 0 };
  }
  const subtotal = options.subtotal ?? 0;
  if (coupon.minimumBookingAmount !== null && subtotal < coupon.minimumBookingAmount) {
    return { valid: false, code: normalizedCode, couponId: coupon.id, reason: "COUPON_MINIMUM_NOT_MET", discount: 0 };
  }
  return {
    valid: true,
    code: normalizedCode,
    couponId: coupon.id,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    discount: applyDiscount(subtotal, {
      type: coupon.discountType,
      value: coupon.discountValue,
      maxDiscount: coupon.maxDiscount,
    }),
  };
}

export async function createCouponRecord(
  input: CreateCouponInput,
  createdBy: string,
): Promise<Coupon> {
  const property = await ensureProperty();
  if (input.applicableRoomTypeIds) {
    for (const roomTypeId of input.applicableRoomTypeIds) {
      const roomType = await findRoomTypeById(roomTypeId);
      if (!roomType || roomType.propertyId !== property.id) {
        throw new AppError("Room type not found", 404, "ROOM_TYPE_NOT_FOUND");
      }
    }
  }
  try {
    const doc = await createCoupon({
      ...input,
      propertyId: property.id,
      normalizedCode: normalizeCode(input.code),
      createdBy,
    });
    const created = await findCouponById(doc._id.toString());
    if (!created) {
      throw new AppError("Coupon could not be created", 500, "COUPON_CREATE_FAILED");
    }
    return created;
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError("A coupon with this code already exists", 409, "COUPON_EXISTS");
    }
    throw error;
  }
}

export async function getCoupon(id: string): Promise<Coupon> {
  const coupon = await findCouponById(id);
  if (!coupon) {
    throw new AppError("Coupon not found", 404, "COUPON_NOT_FOUND");
  }
  return coupon;
}

export async function updateCouponRecord(id: string, input: UpdateCouponInput): Promise<Coupon> {
  if (input.applicableRoomTypeIds) {
    const property = await ensureProperty();
    for (const roomTypeId of input.applicableRoomTypeIds) {
      const roomType = await findRoomTypeById(roomTypeId);
      if (!roomType || roomType.propertyId !== property.id) {
        throw new AppError("Room type not found", 404, "ROOM_TYPE_NOT_FOUND");
      }
    }
  }
  const updated = await updateCouponById(id, input);
  if (!updated) {
    throw new AppError("Coupon not found", 404, "COUPON_NOT_FOUND");
  }
  return updated;
}

export async function listCouponRecords(query: ListCouponsQuery): Promise<Paginated<Coupon>> {
  return listCoupons(query);
}

export async function validateCouponCode(input: ValidateCouponInput): Promise<CouponEvaluation> {
  const property = await ensureProperty();
  return evaluateCoupon(property.id, input.code, {
    roomTypeId: input.roomTypeId,
    subtotal: input.subtotal,
  });
}
