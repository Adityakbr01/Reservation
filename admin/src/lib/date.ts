import { format, differenceInCalendarDays } from "date-fns";

let currentTimeZone =
  (typeof window !== "undefined" && localStorage.getItem("hs_admin_timezone")) ||
  "Europe/London";

/** Set default timezone dynamically from admin settings. */
export function setDefaultTimeZone(tz?: string | null): void {
  if (tz && typeof tz === "string" && tz.trim()) {
    try {
      Intl.DateTimeFormat(undefined, { timeZone: tz.trim() });
      currentTimeZone = tz.trim();
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("hs_admin_timezone", currentTimeZone);
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
 * Returns date input (YYYY-MM-DD) as UTC ISO string:
 * "YYYY-MM-DDT00:00:00.000Z"
 * Immune to browser timezone offsets.
 */
export function toUtcIsoString(dateStr: string): string {
  const day = dateStr.slice(0, 10);
  return `${day}T00:00:00.000Z`;
}

/**
 * Returns date as YYYY-MM-DD.
 */
export function toDayKey(date: Date | string): string {
  if (typeof date === "string") {
    return date.slice(0, 10);
  }
  return date.toISOString().slice(0, 10);
}

/**
 * Formats a Date or date string as a friendly UK string, e.g. "21 Oct 2026".
 */
export function formatDisplayDate(date: Date | string, pattern = "d MMM yyyy"): string {
  const d = toUtcMidnight(date);
  return format(d, pattern);
}

/**
 * Calculates number of nights between start and end.
 */
export function countNights(startDate: Date | string, endDate: Date | string): number {
  const start = toUtcMidnight(startDate);
  const end = toUtcMidnight(endDate);
  return Math.max(0, differenceInCalendarDays(end, start));
}

/**
 * Generates an unambiguous summary of a block for admin UI:
 * e.g. "21 Oct 2026 → 27 Oct 2026 (6 nights · checkout 27 Oct)"
 */
export function formatBlockSummary(startDate: Date | string, endDate: Date | string): {
  range: string;
  nightsText: string;
} {
  const startStr = formatDisplayDate(startDate);
  const endStr = formatDisplayDate(endDate);
  const nights = countNights(startDate, endDate);
  return {
    range: `${startStr} → ${endStr}`,
    nightsText: `${nights} night${nights === 1 ? "" : "s"} blocked · checkout ${endStr}`,
  };
}
