/**
 * Predictable React Query keys.
 * Pattern: ["domain", ...params] — e.g. ["reservations", filters],
 * ["reservation", id], ["availability", searchParams].
 *
 * Add per-module keys here as backend endpoints land
 * (availability, rooms, bookings, payments, cms, ...).
 * Avoid ad-hoc inline keys in hooks.
 */
export const authKeys = {
  all: ["auth"] as const,
  session: () => [...authKeys.all, "session"] as const,
};

export const homeKeys = {
  all: ["home"] as const,
  summary: () => [...homeKeys.all, "summary"] as const,
};

export const userKeys = {
  all: ["me"] as const,
};

export const availabilityKeys = {
  all: ["availability"] as const,
  search: (params: unknown) => [...availabilityKeys.all, "search", params] as const,
  calendar: (cottageId: string, from: string, to: string) =>
    [...availabilityKeys.all, "calendar", cottageId, from, to] as const,
};

export const cottageKeys = {
  all: ["cottage"] as const,
  detail: (slug: string) => [...cottageKeys.all, slug] as const,
};

export const bookingKeys = {
  all: ["booking"] as const,
  quote: (params: unknown) => [...bookingKeys.all, "quote", params] as const,
  detail: (id: string) => [...bookingKeys.all, "detail", id] as const,
  mine: (page: number) => [...bookingKeys.all, "mine", page] as const,
};
