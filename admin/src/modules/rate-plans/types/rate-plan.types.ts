export type RatePlanStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type PricingType = "PER_NIGHT" | "PER_STAY";

export interface RatePlanPricing {
  type: PricingType;
  /** Minor currency unit (paise/cents) as stored by the backend. */
  amount: number;
  currency: string;
}

export interface RatePlanRestrictions {
  minNights: number | null;
  maxNights: number | null;
  minAdvanceDays: number | null;
  maxAdvanceDays: number | null;
  validFrom: string | null;
  validUntil: string | null;
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
  cancellationPolicyId?: string | null;
  status: RatePlanStatus;
  createdAt: string;
  updatedAt: string;
}

export interface RatePlanFilters {
  page: number;
  limit: number;
  q?: string;
  roomTypeId?: string;
  status?: RatePlanStatus;
}

export interface CreateRatePlanPayload {
  roomTypeId: string;
  name: string;
  slug?: string;
  description?: string | null;
  pricing: RatePlanPricing;
  restrictions?: {
    minNights?: number | null;
    maxNights?: number | null;
    minAdvanceDays?: number | null;
    maxAdvanceDays?: number | null;
    validFrom?: string | null;
    validUntil?: string | null;
    daysOfWeek?: number[];
  };
  status?: RatePlanStatus;
}

export type UpdateRatePlanPayload = Partial<CreateRatePlanPayload>;
