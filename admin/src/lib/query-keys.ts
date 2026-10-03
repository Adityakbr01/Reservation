/**
 * Predictable React Query keys.
 * Pattern: ["domain", ...params] — e.g. ["reservations", filters],
 * ["reservation", id], ["availability", searchParams].
 *
 * Add per-module keys here as backend endpoints land
 * (dashboard, reservations, rooms, payments, cms, ...).
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

export const roomTypeKeys = {
  all: ["room-types"] as const,
  list: (filters: unknown) => [...roomTypeKeys.all, "list", filters] as const,
  detail: (id: string) => [...roomTypeKeys.all, "detail", id] as const,
};

export const roomKeys = {
  all: ["rooms"] as const,
  list: (filters: unknown) => [...roomKeys.all, "list", filters] as const,
  detail: (id: string) => [...roomKeys.all, "detail", id] as const,
};

export const ratePlanKeys = {
  all: ["rate-plans"] as const,
  list: (filters: unknown) => [...ratePlanKeys.all, "list", filters] as const,
  detail: (id: string) => [...ratePlanKeys.all, "detail", id] as const,
};

export const availabilityKeys = {
  all: ["availability"] as const,
  blocks: (filters: unknown) => [...availabilityKeys.all, "blocks", filters] as const,
};
