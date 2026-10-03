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

export const reservationKeys = {
  all: ["reservations"] as const,
  list: (filters: unknown) => [...reservationKeys.all, "list", filters] as const,
  detail: (id: string) => [...reservationKeys.all, "detail", id] as const,
};

export const adminPaymentKeys = {
  all: ["admin-payments"] as const,
  list: (filters: unknown) => [...adminPaymentKeys.all, "list", filters] as const,
};

export const refundKeys = {
  all: ["refunds"] as const,
  list: (filters: unknown) => [...refundKeys.all, "list", filters] as const,
};

export const policyKeys = {
  all: ["policies"] as const,
  list: () => [...policyKeys.all, "list"] as const,
};

export const customerKeys = {
  all: ["customers"] as const,
  list: (filters: unknown) => [...customerKeys.all, "list", filters] as const,
  detail: (id: string) => [...customerKeys.all, "detail", id] as const,
};

export const couponKeys = {
  all: ["coupons"] as const,
  list: (filters: unknown) => [...couponKeys.all, "list", filters] as const,
  detail: (id: string) => [...couponKeys.all, "detail", id] as const,
};

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (filters: unknown) => [...notificationKeys.all, "list", filters] as const,
};

export const dashboardKeys = {
  all: ["dashboard"] as const,
  summary: () => [...dashboardKeys.all, "summary"] as const,
};

export const cmsKeys = {
  all: ["cms"] as const,
  pages: (filters: unknown) => [...cmsKeys.all, "pages", filters] as const,
  blogs: (filters: unknown) => [...cmsKeys.all, "blogs", filters] as const,
  faqs: (filters: unknown) => [...cmsKeys.all, "faqs", filters] as const,
  offers: (filters: unknown) => [...cmsKeys.all, "offers", filters] as const,
  policies: () => [...cmsKeys.all, "policies"] as const,
};

export const mediaKeys = {
  all: ["media"] as const,
  list: (filters: unknown) => [...mediaKeys.all, "list", filters] as const,
};

export const settingsKeys = {
  all: ["settings"] as const,
  detail: () => [...settingsKeys.all, "detail"] as const,
};
