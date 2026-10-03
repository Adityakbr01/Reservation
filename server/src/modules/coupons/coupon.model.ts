import mongoose from "mongoose";
import { COUPON_STATUSES, DISCOUNT_TYPES } from "./coupon.types";
import type { CouponStatus, DiscountType } from "./coupon.types";

export interface CouponDocument extends mongoose.Document {
  propertyId: mongoose.Types.ObjectId;
  code: string;
  normalizedCode: string;
  discountType: DiscountType;
  discountValue: number;
  maxDiscount: number | null;
  minimumBookingAmount: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  usageLimit: number | null;
  usageCount: number;
  perUserLimit: number | null;
  applicableRoomTypeIds: mongoose.Types.ObjectId[];
  status: CouponStatus;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new mongoose.Schema<CouponDocument>(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    code: { type: String, required: true, trim: true, minlength: 2, maxlength: 40 },
    normalizedCode: { type: String, required: true, uppercase: true, trim: true },
    discountType: { type: String, enum: DISCOUNT_TYPES, required: true },
    discountValue: { type: Number, required: true, min: 1 },
    maxDiscount: { type: Number, default: null, min: 0 },
    minimumBookingAmount: { type: Number, default: null, min: 0 },
    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },
    usageLimit: { type: Number, default: null, min: 1 },
    usageCount: { type: Number, required: true, default: 0, min: 0 },
    perUserLimit: { type: Number, default: null, min: 1 },
    applicableRoomTypeIds: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "RoomType" }],
      default: [],
    },
    status: { type: String, enum: COUPON_STATUSES, default: "ACTIVE", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

couponSchema.index({ propertyId: 1, normalizedCode: 1 }, { unique: true });
couponSchema.index({ propertyId: 1, status: 1, validFrom: 1, validUntil: 1 });

// Guarded for --hot reloads.
export const CouponModel =
  mongoose.models.Coupon ?? mongoose.model<CouponDocument>("Coupon", couponSchema);
