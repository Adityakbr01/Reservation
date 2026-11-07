import { useEffect, type ReactNode } from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import { settingsKeys } from "@/lib/query-keys";
import { setDefaultCurrency } from "@/lib/money";
import { setDefaultTimeZone } from "@/lib/date";

interface SettingsData {
  currency?: string;
  timezone?: string;
  propertyName?: string;
}

function AdminSettingsInitializer({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: settingsKeys.detail(),
    queryFn: async () => {
      try {
        const r = await apiClient.get<ApiEnvelope<SettingsData>>("/admin/settings");
        return unwrapResponse(r);
      } catch {
        // Fallback to public site settings if unauthenticated
        try {
          const r = await apiClient.get<ApiEnvelope<SettingsData>>("/public/cms/site-settings");
          return unwrapResponse(r);
        } catch {
          return null;
        }
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (data?.currency) {
      setDefaultCurrency(data.currency);
    }
    if (data?.timezone) {
      setDefaultTimeZone(data.timezone);
    }
  }, [data?.currency, data?.timezone]);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminSettingsInitializer>{children}</AdminSettingsInitializer>
    </QueryClientProvider>
  );
}
