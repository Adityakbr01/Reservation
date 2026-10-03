export const RATE_PLAN_STATUSES = ["DRAFT", "ACTIVE", "INACTIVE"] as const;

export type RatePlanStatus = (typeof RATE_PLAN_STATUSES)[number];

export const PRICING_TYPES = ["PER_NIGHT", "PER_STAY"] as const;

export type PricingType = (typeof PRICING_TYPES)[number];

export interface RatePlanPricing {
  type: PricingType;
  /** Minor currency unit (paise/cents). Server-trusted; never client-computed. */
  amount: number;
  currency: string;
}

export interface RatePlanRestrictions {
  minNights: number | null;
  maxNights: number | null;
  minAdvanceDays: number | null;
  maxAdvanceDays: number | null;
  validFrom: Date | null;
  validUntil: Date | null;
  daysOfWeek: number[];
}

export interface RatePlan {
  id: string;
  propertyId: string;
  roomTypeId: string;
  name: string;
  slug: string;
  description: string | null;
  pricing: RatePlanPricing;
  restrictions: RatePlanRestrictions;
  cancellationPolicyId: string | null;
  status: RatePlanStatus;
  createdAt: Date;
  updatedAt: Date;
}
