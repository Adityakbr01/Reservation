import { queryClient } from "./query-client";
import { apiClient, unwrapResponse } from "./api-client";
import type { ApiEnvelope } from "./api-client";
import {
  adminPaymentKeys,
  availabilityKeys,
  cmsKeys,
  couponKeys,
  customerKeys,
  dashboardKeys,
  mediaKeys,
  notificationKeys,
  ratePlanKeys,
  refundKeys,
  reservationKeys,
  cottageKeys,
} from "./query-keys";
import { listBlogs, listFaqs, listOffers, listPages, listPolicies } from "@/modules/cms/api/cms.api";
import { listCoupons } from "@/modules/coupons/api/coupons.api";
import { listCottages } from "@/modules/cottages/api/cottages.api";
import { listRatePlans } from "@/modules/rate-plans/api/rate-plans.api";
import { listReservations } from "@/modules/reservations/api/reservations.api";
import { listAdminPayments, listAdminRefunds } from "@/modules/payments/api/payments.api";
import { listCustomers } from "@/modules/customers/api/customers.api";
import { listBlocks } from "@/modules/availability/api/availability.api";
import { listNotifications } from "@/modules/notifications/api/notifications.api";
import { listMedia } from "@/modules/media/hooks/use-media";

const FIRST_PAGE = { page: 1, limit: 10 } as const;

function prefetch(key: readonly unknown[], fn: () => Promise<unknown>) {
  void queryClient.prefetchQuery({ queryKey: key, queryFn: fn }).catch(() => {
    // Prefetch is best-effort: the page fetch will retry on mount.
  });
}

async function fetchDashboardSummary(): Promise<unknown> {
  const response = await apiClient.get<ApiEnvelope<unknown>>("/admin/dashboard/summary");
  return unwrapResponse(response);
}

async function fetchSalesWeek(): Promise<unknown> {
  const response = await apiClient.get<ApiEnvelope<unknown>>("/admin/dashboard/sales", {
    params: { range: "week" },
  });
  return unwrapResponse(response);
}

/**
 * Sidebar hover/focus prefetch: warms the React Query cache with each
 * page's default first-page filters, so tab switches render instantly
 * instead of waiting on the network. Keys mirror the page hooks exactly.
 */
const PREFETCHERS: Record<string, Array<() => void>> = {
  "/dashboard": [
    () => prefetch(dashboardKeys.summary(), fetchDashboardSummary),
    () => prefetch([...dashboardKeys.summary(), "sales", "week"] as const, fetchSalesWeek),
  ],
  "/sales": [
    () => prefetch([...dashboardKeys.summary(), "sales", "week"] as const, fetchSalesWeek),
  ],
  "/reservations": [
    () => prefetch(reservationKeys.list(FIRST_PAGE), () => listReservations({ ...FIRST_PAGE })),
  ],
  "/customers": [
    () => prefetch(customerKeys.list(FIRST_PAGE), () => listCustomers({ ...FIRST_PAGE })),
  ],
  "/cottages": [
    () => prefetch(cottageKeys.list(FIRST_PAGE), () => listCottages({ ...FIRST_PAGE })),
  ],
  "/rate-plans": [
    () => prefetch(ratePlanKeys.list(FIRST_PAGE), () => listRatePlans({ ...FIRST_PAGE })),
    () => prefetch(cottageKeys.list({ page: 1, limit: 100 }), () =>
      listCottages({ page: 1, limit: 100 }),
    ),
  ],
  "/availability": [
    () => prefetch(availabilityKeys.blocks(FIRST_PAGE), () => listBlocks({ ...FIRST_PAGE })),
    () => prefetch(cottageKeys.list({ page: 1, limit: 100 }), () => listCottages({ page: 1, limit: 100 })),
  ],
  "/payments": [
    () => prefetch(adminPaymentKeys.list(FIRST_PAGE), () => listAdminPayments({ ...FIRST_PAGE })),
    () => prefetch(refundKeys.list(FIRST_PAGE), () => listAdminRefunds({ ...FIRST_PAGE })),
  ],
  "/coupons": [
    () => prefetch(couponKeys.list(FIRST_PAGE), () => listCoupons({ ...FIRST_PAGE })),
  ],
  "/notifications": [
    () => prefetch(notificationKeys.list(FIRST_PAGE), () => listNotifications({ ...FIRST_PAGE })),
  ],
  "/cms/pages": [
    () => prefetch(cmsKeys.pages(FIRST_PAGE), () => listPages({ ...FIRST_PAGE })),
  ],
  "/cms/blogs": [
    () => prefetch(cmsKeys.blogs(FIRST_PAGE), () => listBlogs({ ...FIRST_PAGE })),
  ],
  "/cms/faqs": [
    () => prefetch(cmsKeys.faqs({ page: 1, limit: 100 }), () => listFaqs({ page: 1, limit: 100 })),
  ],
  "/cms/offers": [
    () => prefetch(cmsKeys.offers(FIRST_PAGE), () => listOffers({ ...FIRST_PAGE })),
  ],
  "/cms/policies": [() => prefetch(cmsKeys.policies(), () => listPolicies())],
  "/media": [
    () => prefetch(mediaKeys.list({ page: 1, limit: 12 }), () => listMedia({ page: 1, limit: 12 })),
  ],
};

export function prefetchRoute(to: string) {
  const jobs = PREFETCHERS[to];
  if (!jobs) return;
  for (const job of jobs) job();
}
