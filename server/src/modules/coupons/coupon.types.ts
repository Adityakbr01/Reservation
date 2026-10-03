export const COUPON_STATUSES = ["ACTIVE", "INACTIVE", "EXPIRED"] as const;

export type CouponStatus = (typeof COUPON_STATUSES)[number];

export const DISCOUNT_TYPES = ["PERCENTAGE", "FIXED"] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export interface Coupon {
  id: string;
  propertyId: string;
  code: string;
  normalizedCode: string;
  discountType: DiscountType;
  /** Percent (1-100) or fixed minor units, per discountType. */
  discountValue: number;
  /** Minor units cap, PERCENTAGE only. */
  maxDiscount: number | null;
  /** Minor units minimum subtotal. */
  minimumBookingAmount: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  usageLimit: number | null;
  usageCount: number;
  applicableRoomTypeIds: string[];
  status: CouponStatus;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}
