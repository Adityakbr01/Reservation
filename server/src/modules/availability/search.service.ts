import { AppError } from "../../utils/app-error";
import { isValidStayRange } from "../../utils/availability";
import { findConflictingBookingRoomIds } from "../bookings/booking.repository";
import { findHeldRoomIds } from "../bookings/hold.store";
import { getProperty } from "../properties/property.service";
import { listRatePlans } from "../ratePlans/rate-plan.repository";
import { listRoomTypes } from "../roomTypes/room-type.repository";
import { listRooms } from "../rooms/room.repository";
import { findOverlappingBlockedRoomIds } from "./availability-block.repository";
import type { SearchAvailabilityInput } from "./search.schema";
import type { SearchRate, SearchResponse, SearchResultItem } from "./types/search.types";
import type { RatePlan } from "../ratePlans/rate-plan.types";

const MS_PER_NIGHT = 24 * 60 * 60 * 1000;

export function computeNights(checkIn: Date, checkOut: Date): number {
  return Math.round((checkOut.getTime() - checkIn.getTime()) / MS_PER_NIGHT);
}

/**
 * Decides whether a rate plan can price a stay. Pure logic, unit-tested.
 * Day-of-week and advance-purchase rules arrive with the quote engine
 * (Phase 5); search applies window + length rules only.
 */
export function isPlanApplicable(
  plan: Pick<RatePlan, "status" | "restrictions">,
  checkIn: Date,
  checkOut: Date,
  nights: number,
): boolean {
  if (plan.status !== "ACTIVE") return false;
  const { validFrom, validUntil, minNights, maxNights } = plan.restrictions;
  if (validFrom && validFrom.getTime() > checkOut.getTime()) return false;
  if (validUntil && validUntil.getTime() < checkIn.getTime()) return false;
  if (minNights !== null && nights < minNights) return false;
  if (maxNights !== null && nights > maxNights) return false;
  return true;
}

async function pricePlan(plan: RatePlan, nights: number, checkIn: Date, checkOut: Date): Promise<SearchRate> {
  // Date-wise pricing: sum nightly overrides with fallback to base per-night.
  // PER_STAY plans keep flat amount (nightly shown as averaged breakdown).
  try {
    const { getDailyPriceMap, stayDayKeys, sumNightlyTotal } = await import(
      "../ratePlans/daily-price.model"
    );
    const days = stayDayKeys(checkIn, checkOut);
    const overrides = await getDailyPriceMap(plan.id, checkIn, checkOut);
    const { total, nightly } = sumNightlyTotal(
      days,
      overrides,
      plan.pricing.amount,
      plan.pricing.type,
      plan.pricing.type === "PER_NIGHT" ? plan.pricing.amount * nights : plan.pricing.amount,
    );
    return {
      ratePlanId: plan.id,
      name: plan.name,
      pricingType: plan.pricing.type,
      perNight: plan.pricing.type === "PER_NIGHT" ? Math.round(total / Math.max(1, nights)) : Math.round(total / Math.max(1, nights)),
      total,
      currency: plan.pricing.currency,
      nightly,
    };
  } catch {
    const total = plan.pricing.type === "PER_NIGHT" ? plan.pricing.amount * nights : plan.pricing.amount;
    return {
      ratePlanId: plan.id,
      name: plan.name,
      pricingType: plan.pricing.type,
      perNight: plan.pricing.type === "PER_NIGHT" ? plan.pricing.amount : Math.round(total / nights),
      total,
      currency: plan.pricing.currency,
    };
  }
}

/**
 * Availability search (docs 06 §5). Informational only — never a reservation.
 * Fully-booked types stay visible with availableCount 0 (guests see what
 * exists; booking rechecks + holds stay mandatory). Excludes manual blocks,
 * conflicting reservations/holds, and non-ACTIVE rooms from the count.
 */
export async function searchAvailability(input: SearchAvailabilityInput): Promise<SearchResponse> {
  const { checkIn, checkOut, adults, children, rooms: roomsWanted } = input;
  if (!isValidStayRange(checkIn, checkOut)) {
    throw new AppError("Check-out must be after check-in and in the future", 400, "INVALID_DATE_RANGE");
  }
  const nights = computeNights(checkIn, checkOut);

  const property = await getProperty();
  const empty = {
    results: [],
    search: {
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      adults,
      children,
      rooms: roomsWanted,
      nights,
    },
  };
  if (!property || property.status !== "ACTIVE") return empty;

  const guests = adults + children;
  const [typesPage, roomsPage, blockedRoomIds] = await Promise.all([
    listRoomTypes({ page: 1, limit: 500, onlyActive: true }),
    listRooms({ page: 1, limit: 2000, status: "ACTIVE" }),
    findOverlappingBlockedRoomIds(checkIn, checkOut),
  ]);
  const allRoomIds = roomsPage.data.map((room) => room.id);
  const bookingBlocked = await findConflictingBookingRoomIds(allRoomIds, checkIn, checkOut);
  const heldIds = findHeldRoomIds(allRoomIds, checkIn, checkOut);

  const roomsByType = new Map<string, string[]>();
  for (const room of roomsPage.data) {
    if (blockedRoomIds.has(room.id) || bookingBlocked.has(room.id) || heldIds.has(room.id)) {
      continue;
    }
    const list = roomsByType.get(room.roomTypeId) ?? [];
    list.push(room.id);
    roomsByType.set(room.roomTypeId, list);
  }

  const results: SearchResultItem[] = [];
  for (const roomType of typesPage.data) {
    if (adults > roomType.maxAdults || guests > roomType.maxOccupancy) continue;
    const availableIds = roomsByType.get(roomType.id) ?? [];
    // Sold-out types remain listed (availableCount 0) so guests can see
    // every cottage; only insufficient-for-request counts stay hidden.
    if (availableIds.length > 0 && availableIds.length < roomsWanted) continue;

    const plansPage = await listRatePlans({
      page: 1,
      limit: 200,
      roomTypeId: roomType.id,
      status: "ACTIVE",
    });
    const applicable = plansPage.data.filter((plan) => isPlanApplicable(plan, checkIn, checkOut, nights));
    const rates = await Promise.all(applicable.map((plan) => pricePlan(plan, nights, checkIn, checkOut)));
    if (rates.length === 0) continue;

    results.push({ roomType, availableCount: availableIds.length, rates });
  }
  // Bookable first, sold-out last — stable otherwise.
  results.sort((a, b) => Number(a.availableCount === 0) - Number(b.availableCount === 0));

  return {
    results,
    search: {
      checkIn: checkIn.toISOString(),
      checkOut: checkOut.toISOString(),
      adults,
      children,
      rooms: roomsWanted,
      nights,
    },
  };
}
