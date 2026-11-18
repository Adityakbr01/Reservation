import { useQuery } from "@tanstack/react-query";
import { cottageKeys } from "@/lib/query-keys";
import { getCottageBySlug } from "../api/cottages.api";

export function useCottageBySlug(slug: string) {
  return useQuery({
    queryKey: cottageKeys.detail(slug),
    queryFn: () => getCottageBySlug(slug),
    enabled: slug.length > 0,
    retry: false,
    staleTime: 30_000,
  });
}

