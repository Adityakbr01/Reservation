export { adminCouponsRouter, publicCouponsRouter } from "./coupon.routes";
export {
  createCouponRecord,
  evaluateCoupon,
  getCoupon,
  listCouponRecords,
  updateCouponRecord,
  validateCouponCode,
} from "./coupon.service";
export { COUPON_STATUSES, DISCOUNT_TYPES } from "./coupon.types";
export type { Coupon, CouponStatus, DiscountType } from "./coupon.types";
