import { format, differenceInCalendarDays, addDays } from "date-fns";

let currentTimeZone =
  (typeof window !== "undefined" && localStorage.getItem("hs_timezone")) ||
  "Europe/London";

/** Set default timezone dynamically from admin settings. */
export function setDefaultTimeZone(tz?: string | null): void {
  if (tz && typeof tz === "string" && tz.trim()) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
      currentTimeZone = tz.trim();
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("hs_timezone", currentTimeZone);
        } catch {}
      }
    } catch {
      // Ignore invalid IANA timezone string
    }
  }
}

/** Get the currently active timezone identifier (e.g. "Europe/London"). */
export function getDefaultTimeZone(): string {
  return currentTimeZone || "Europe/London";
}

/**
 * Formats a Date or date string in the admin-configured Timezone.
 * Example: "7 Nov 2026"
 */
export function formatDateTime(
  input: Date | string | number | null | undefined,
  options?: Intl.DateTimeFormatOptions,
  timeZone?: string
): string {
  if (!input) return "";
  const d = typeof input === "string" || typeof input === "number" ? new Date(input) : input;
  if (isNaN(d.getTime())) return "";

  const tz = timeZone || getDefaultTimeZone();
  const defaultOpts: Intl.DateTimeFormatOptions = {
    timeZone: tz,
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options,
  };

  try {
    return new Intl.DateTimeFormat("en-GB", defaultOpts).format(d);
  } catch {
    return d.toLocaleDateString("en-GB");
  }
}

/**
 * Formats a Date or date string with both date and time in the admin-configured Timezone.
 * Example: "7 Nov 2026, 14:30"
 */
export function formatDateTimeWithTime(
  input: Date | string | number | null | undefined,
  timeZone?: string
): string {
  return formatDateTime(
    input,
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    },
    timeZone
  );
}

/**
 * Normalizes any Date or date string to strict UTC midnight:
 * YYYY-MM-DDT00:00:00.000Z
 */
export function toUtcMidnight(input: Date | string): Date {
  if (typeof input === "string") {
    const dayStr = input.slice(0, 10);
    return new Date(`${dayStr}T00:00:00.000Z`);
  }
  const dayStr = input.toISOString().slice(0, 10);
  return new Date(`${dayStr}T00:00:00.000Z`);
}

/**
 * Returns date as YYYY-MM-DD.
 */
export function toDayKey(date: Date | string): string {
  if (typeof date === "string") {
    return date.slice(0, 10);
  }
  return format(date, "yyyy-MM-dd");
}

/**
 * Formats a Date or date string as a friendly UK string, e.g. "21 Oct 2026".
 */
export function formatDisplayDate(date: Date | string, pattern = "d MMM yyyy"): string {
  const d = toUtcMidnight(date);
  return format(d, pattern);
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
 * Checks if a given dayKey falls strictly between check-in and check-out (exclusive endpoints).
 */
export function isDayInRange(dayKey: string, checkIn?: string | null, checkOut?: string | null): boolean {
  if (!checkIn || !checkOut) return false;
  return dayKey > checkIn && dayKey < checkOut;
}

/**
 * Validates whether candidateCheckout is valid for checkIn without crossing any blocked nights.
 * A stay occupies nights [checkIn, candidateCheckout).
 * Any blocked night inside that range makes the candidate checkout invalid.
 */
export function isContiguousStayAvailable(
  checkIn: string,
  candidateCheckout: string,
  blockedDates: Set<string>,
): boolean {
  if (candidateCheckout <= checkIn) return false;
  if (blockedDates.has(candidateCheckout)) return false;
  let cursor = toUtcMidnight(checkIn);
  const end = toUtcMidnight(candidateCheckout);
  while (cursor.getTime() < end.getTime()) {
    const key = toDayKey(cursor);
    if (blockedDates.has(key)) return false;
    cursor = addDays(cursor, 1);
  }
  return true;
}

/**
 * Finds the earliest blocked night at or after checkIn.
 * Guests may check out ON this day (morning), but cannot stay across it.
 */
export function findFirstBlockedNight(checkIn: string, blockedDates: Set<string>): string | null {
  const keys = Array.from(blockedDates).filter((k) => k >= checkIn).sort();
  return keys[0] ?? null;
}
