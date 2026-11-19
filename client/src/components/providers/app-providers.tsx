import { useEffect, type ReactNode } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";
import { setDefaultCurrency } from "@/lib/money";
import { setDefaultTimeZone } from "@/lib/date";
import { useSiteSettings } from "@/modules/cms/hooks/use-cms";

function SettingsInitializer({ children }: { children: ReactNode }) {
  const { data } = useSiteSettings();

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
