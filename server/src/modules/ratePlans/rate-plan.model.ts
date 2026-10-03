import mongoose from "mongoose";
import { PRICING_TYPES, RATE_PLAN_STATUSES } from "./rate-plan.types";
import type {
  RatePlanPricing,
  RatePlanRestrictions,
  RatePlanStatus,
} from "./rate-plan.types";

export interface RatePlanDocument extends mongoose.Document {
  propertyId: mongoose.Types.ObjectId;
  roomTypeId: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  description: string | null;
  pricing: RatePlanPricing;
  restrictions: RatePlanRestrictions;
  cancellationPolicyId: mongoose.Types.ObjectId | null;
  status: RatePlanStatus;
  createdAt: Date;
  updatedAt: Date;
}

const pricingSchema = new mongoose.Schema<RatePlanPricing>(
  {
    type: { type: String, enum: PRICING_TYPES, required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, maxlength: 3 },
  },
  { _id: false },
);

const restrictionsSchema = new mongoose.Schema<RatePlanRestrictions>(
  {
    minNights: { type: Number, default: null, min: 1 },
    maxNights: { type: Number, default: null, min: 1 },
    minAdvanceDays: { type: Number, default: null, min: 0 },
    maxAdvanceDays: { type: Number, default: null, min: 0 },
    validFrom: { type: Date, default: null },
    validUntil: { type: Date, default: null },
    daysOfWeek: { type: [Number], default: [] },
  },
  { _id: false },
);

const ratePlanSchema = new mongoose.Schema<RatePlanDocument>(
  {
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: "Property", required: true },
    roomTypeId: { type: mongoose.Schema.Types.ObjectId, ref: "RoomType", required: true },
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 120 },
    slug: { type: String, required: true, trim: true, maxlength: 140 },
    description: { type: String, default: null },
    pricing: { type: pricingSchema, required: true },
    restrictions: { type: restrictionsSchema, default: () => ({}) },
    cancellationPolicyId: { type: mongoose.Schema.Types.ObjectId, default: null },
    status: { type: String, enum: RATE_PLAN_STATUSES, default: "DRAFT", required: true },
  },
  { timestamps: true },
);

ratePlanSchema.index({ propertyId: 1, roomTypeId: 1, status: 1 });
ratePlanSchema.index({ propertyId: 1, slug: 1 }, { unique: true });

// Guarded for --hot reloads.
export const RatePlanModel =
  mongoose.models.RatePlan ?? mongoose.model<RatePlanDocument>("RatePlan", ratePlanSchema);
