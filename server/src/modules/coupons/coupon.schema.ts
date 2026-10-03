import { z } from "zod";
import { objectIdSchema } from "../../utils/validators";
import { paginationQuerySchema } from "../../utils/pagination";
import { COUPON_STATUSES, DISCOUNT_TYPES } from "./coupon.types";

const dateSchema = z.coerce.date();

export const createCouponSchema = z.object({
  code: z.string().trim().min(2).max(40),
  discountType: z.enum(DISCOUNT_TYPES),
  discountValue: z.number().int().min(1),
  maxDiscount: z.number().int().min(0).nullable().optional(),
  minimumBookingAmount: z.number().int().min(0).nullable().optional(),
  validFrom: dateSchema.nullable().optional(),
  validUntil: dateSchema.nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perUserLimit: z.number().int().min(1).nullable().optional(),
  applicableRoomTypeIds: z.array(objectIdSchema).max(100).optional(),
  status: z.enum(COUPON_STATUSES).optional(),
}).refine(
  (value) => value.discountType !== "PERCENTAGE" || value.discountValue <= 100,
  { message: "Percentage discount cannot exceed 100", path: ["discountValue"] },
);

export const updateCouponSchema = z.object({
  discountValue: z.number().int().min(1).optional(),
  maxDiscount: z.number().int().min(0).nullable().optional(),
  minimumBookingAmount: z.number().int().min(0).nullable().optional(),
  validFrom: dateSchema.nullable().optional(),
  validUntil: dateSchema.nullable().optional(),
  usageLimit: z.number().int().min(1).nullable().optional(),
  perUserLimit: z.number().int().min(1).nullable().optional(),
  applicableRoomTypeIds: z.array(objectIdSchema).max(100).optional(),
  status: z.enum(COUPON_STATUSES).optional(),
});

export const listCouponsQuerySchema = paginationQuerySchema.extend({
  q: z.string().trim().max(40).optional(),
  status: z.enum(COUPON_STATUSES).optional(),
});

export const couponIdParamsSchema = z.object({ id: objectIdSchema });

export const validateCouponSchema = z.object({
  code: z.string().trim().min(1).max(40),
  roomTypeId: objectIdSchema.optional(),
  subtotal: z.number().int().min(0).optional(),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
