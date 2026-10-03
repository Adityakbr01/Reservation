import { randomBytes } from "node:crypto";
import { AppError } from "../../utils/app-error";
import { isValidStayRange } from "../../utils/availability";
import { cacheStore } from "../../config/cache";
import { computeNights, isPlanApplicable } from "../availability/search.service";
import { evaluateCoupon } from "../coupons/coupon.service";
import { findRatePlanById } from "../ratePlans/rate-plan.repository";
import { findRoomTypeById } from "../roomTypes/room-type.repository";
import type { QuoteRequest } from "./quote.schema";

const QUOTE_TTL_SECONDS = 15 * 60;

export interface QuotePricing {
  subtotal: number;
  discount: number;
  /** Always zero until the tax engine lands (settings phase). Never invent rates. */
  tax: number;
  total: number;
  currency: string;
}

export interface Quote {
  quoteId: string;
  expiresAt: string;
  pricing: QuotePricing;
}

interface StoredQuote extends Quote {
  request: {
    checkIn: string;
    checkOut: string;
    roomTypeId: string;
    ratePlanId: string;
    quantity: number;
    couponCode: string | null;
  };
}

/** Stored for the booking flow (Phase 6). Recomputed there regardless. */
export async function getStoredQuote(quoteId: string): Promise<StoredQuote | null> {
  return cacheStore.get<StoredQuote>(`quote:${quoteId}`) ?? null;
}

/**
 * Authoritative pre-booking pricing. Computes from server-side rate data
 * only — client prices are never trusted. Invalid coupons fail loudly
 * (422) because a quote feeds payment, unlike the forgiving validate UX.
 */
export async function createQuote(input: QuoteRequest): Promise<Quote> {
  const { checkIn, checkOut, roomTypeId, ratePlanId, quantity } = input;
  if (!isValidStayRange(checkIn, checkOut)) {
    throw new AppError("Check-out must be after check-in and in the future", 400, "INVALID_DATE_RANGE");
  }
  const nights = computeNights(checkIn, checkOut);

  const roomType = await findRoomTypeById(roomTypeId);
  if (!roomType || roomType.status !== "ACTIVE") {
    throw new AppError("Room type not found", 404, "ROOM_TYPE_NOT_FOUND");
  }
  const plan = await findRatePlanById(ratePlanId);
  if (!plan) {
    throw new AppError("Rate plan not found", 404, "RATE_PLAN_NOT_FOUND");
  }
  if (plan.roomTypeId !== roomType.id) {
    throw new AppError("Rate plan does not belong to this room type", 400, "RATE_PLAN_MISMATCH");
  }
  if (!isPlanApplicable(plan, checkIn, checkOut, nights)) {
    throw new AppError("Rate plan is not applicable to these dates", 400, "RATE_PLAN_INACTIVE");
  }

  const unitTotal = plan.pricing.type === "PER_NIGHT" ? plan.pricing.amount * nights : plan.pricing.amount;
  const subtotal = unitTotal * quantity;

  let discount = 0;
  if (input.couponCode) {
    const evaluation = await evaluateCoupon(roomType.propertyId, input.couponCode, {
      roomTypeId: roomType.id,
      subtotal,
    });
    if (!evaluation.valid) {
      throw new AppError("Coupon cannot be applied", 422, evaluation.reason ?? "COUPON_INVALID");
    }
    discount = evaluation.discount;
  }

  const pricing: QuotePricing = {
    subtotal,
    discount,
    tax: 0,
    total: subtotal - discount,
    currency: plan.pricing.currency,
  };
  const quoteId = `quote_${randomBytes(9).toString("hex")}`;
  const expiresAt = new Date(Date.now() + QUOTE_TTL_SECONDS * 1000).toISOString();
  const stored: StoredQuote = {
    quoteId,
    expiresAt,
    pricing,
    request: {
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      roomTypeId: roomType.id,
      ratePlanId: plan.id,
      quantity,
      couponCode: input.couponCode ?? null,
    },
  };
  cacheStore.set(`quote:${quoteId}`, stored, QUOTE_TTL_SECONDS);
  return { quoteId, expiresAt, pricing };
}
