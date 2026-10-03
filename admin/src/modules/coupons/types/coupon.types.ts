export type DiscountType = "PERCENTAGE" | "FIXED";

export type CouponStatus = "ACTIVE" | "INACTIVE" | "EXPIRED";

export interface Coupon {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minimumBookingAmount: number | null;
  validFrom: string | null;
  validUntil: string | null;
  usageLimit: number | null;
  usageCount: number;
  applicableRoomTypeIds: string[];
  status: CouponStatus;
  createdAt: string;
}

export interface CouponFilters {
  page: number;
  limit: number;
  q?: string;
  status?: CouponStatus;
}

export interface CreateCouponPayload {
  code: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minimumBookingAmount: number | null;
  validFrom: string | null;
  validUntil: string | null;
  usageLimit: number | null;
  applicableRoomTypeIds: string[];
  status?: CouponStatus;
}

export type UpdateCouponPayload = Partial<
  Pick<
    CreateCouponPayload,
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
