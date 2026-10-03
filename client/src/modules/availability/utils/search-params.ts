import type { AvailabilitySearchParams } from "../types/availability.types";

/** Shared URL ↔ search-params conversion (home + detail stay in sync). */
export function parseAvailabilitySearchParams(
  params: URLSearchParams,
): AvailabilitySearchParams | null {
  const checkIn = params.get("checkIn") ?? "";
  const checkOut = params.get("checkOut") ?? "";
  const adults = Number(params.get("adults") ?? "2");
  const children = Number(params.get("children") ?? "0");
  const rooms = Number(params.get("rooms") ?? "1");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(checkIn) || !/^\d{4}-\d{2}-\d{2}$/.test(checkOut)) return null;
  if (checkOut <= checkIn) return null;
  if (![adults, children, rooms].every((n) => Number.isFinite(n))) return null;
  if (adults < 1 || children < 0 || rooms < 1) return null;
  return { checkIn, checkOut, adults, children, rooms };
}

export function toSearchRecord(params: AvailabilitySearchParams): Record<string, string> {
  return {
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults: String(params.adults),
    children: String(params.children),
    rooms: String(params.rooms),
  };
}
