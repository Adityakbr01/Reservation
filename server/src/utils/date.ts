import { format, differenceInCalendarDays, addDays } from "date-fns";

/**
 * Normalizes any Date or date string to strict UTC midnight:
 * YYYY-MM-DDT00:00:00.000Z
 */
export function toUtcMidnight(input: Date | string): Date {
  if (typeof input === "string") {
    // If it's a date-only string like "2026-10-21" or ISO with T
    const dayStr = input.slice(0, 10);
    return new Date(`${dayStr}T00:00:00.000Z`);
  }
  const iso = input.toISOString();
  const dayStr = iso.slice(0, 10);
  return new Date(`${dayStr}T00:00:00.000Z`);
}

/**
 * Returns date as YYYY-MM-DD in UTC.
 */
export function toDayKey(date: Date | string): string {
  if (typeof date === "string") {
    return date.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Generates an array of YYYY-MM-DD day keys for every night in [checkIn, checkOut).
 * Checkout day is exclusive. Pure, UTC-safe, immune to local timezone offsets.
 */
export function occupiedDayKeys(checkIn: Date | string, checkOut: Date | string): string[] {
  const start = toUtcMidnight(checkIn);
  const end = toUtcMidnight(checkOut);
  const keys: string[] = [];

  let cursor = new Date(start);
  while (cursor.getTime() < end.getTime()) {
    keys.push(toDayKey(cursor));
    cursor = addDays(cursor, 1);
    if (keys.length > 366) break; // guard against runaway ranges
  }
  return keys;
}

/**
 * Calculates number of nights between check-in and check-out.
 */
export function countNights(checkIn: Date | string, checkOut: Date | string): number {
  const start = toUtcMidnight(checkIn);
  const end = toUtcMidnight(checkOut);
  return Math.max(0, differenceInCalendarDays(end, start));
}

/**
 * Formats a Date or ISO string into a human-readable UK format e.g. "21 Oct 2026".
 */
export function formatUkDate(date: Date | string): string {
  const d = toUtcMidnight(date);
  return format(d, "d MMM yyyy");
}
