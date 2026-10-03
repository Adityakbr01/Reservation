import { useQuery } from "@tanstack/react-query";
import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import { dashboardKeys } from "@/lib/query-keys";

export interface DashboardSummary {
  todayArrivals: number;
  todayDepartures: number;
  currentGuests: number;
  upcomingReservations: number;
  pendingPayments: number;
  paymentFailures24h: number;
  todayBookingValue: number;
  todayBookingCurrency: string | null;
  pendingRefunds: number;
  failedNotifications: number;
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: dashboardKeys.summary(),
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<DashboardSummary>>(
        "/admin/dashboard/summary",
      );
      return unwrapResponse(response);
    },
    refetchInterval: 60_000,
  });
}
