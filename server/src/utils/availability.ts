export interface StayRange {
  checkIn: Date | string;
  checkOut: Date | string;
}

function toTime(value: Date | string): number {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

/**
 * Authoritative availability overlap rule: checkout is exclusive.
 * overlap ⟺ existingCheckIn < requestedCheckOut && existingCheckOut > requestedCheckIn
 */
export function isOverlappingStay(existing: StayRange, requested: StayRange): boolean {
  const existingIn = toTime(existing.checkIn);
  const existingOut = toTime(existing.checkOut);
  const requestedIn = toTime(requested.checkIn);
  const requestedOut = toTime(requested.checkOut);
  return existingIn < requestedOut && existingOut > requestedIn;
}

/** A stay is valid when checkout is after check-in and the stay has not ended. */
export function isValidStayRange(
  checkIn: Date | string,
  checkOut: Date | string,
  now: Date = new Date(),
): boolean {
  const start = toTime(checkIn);
  const end = toTime(checkOut);
  if (Number.isNaN(start) || Number.isNaN(end)) return false;
  return start < end && end > now.getTime();
}
