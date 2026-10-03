import { useQuery } from "@tanstack/react-query";
import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import { dashboardKeys } from "@/lib/query-keys";
import type { SalesRange, SalesReport } from "../pages/SalesPage";

export function useSales(range: SalesRange) {
  return useQuery({
    queryKey: [...dashboardKeys.summary(), "sales", range] as const,
    queryFn: async () => {
      const response = await apiClient.get<ApiEnvelope<SalesReport>>("/admin/dashboard/sales", {
        params: { range },
      });
      return unwrapResponse(response);
    },
    refetchInterval: 60_000,
  });
}
