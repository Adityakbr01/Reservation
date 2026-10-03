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
};

export const roomTypeKeys = {
  all: ["room-type"] as const,
  detail: (slug: string) => [...roomTypeKeys.all, slug] as const,
};
