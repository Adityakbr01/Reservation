import { useEffect, type ReactNode } from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { publicApiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import { setDefaultCurrency } from "@/lib/money";
import { setDefaultTimeZone } from "@/lib/date";

interface SiteSettingsData {
  currency?: string;
  timezone?: string;
  propertyName?: string;
  whyBookWithUs?: Array<{ title: string; text?: string | null }>;
}

function SettingsInitializer({ children }: { children: ReactNode }) {
  const { data } = useQuery({
    queryKey: ["public-site-settings"],
    queryFn: async () => {
      const r = await publicApiClient.get<ApiEnvelope<SiteSettingsData>>("/public/cms/site-settings");
      return unwrapResponse(r);
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
      <SettingsInitializer>{children}</SettingsInitializer>
    </QueryClientProvider>
  );
}
