import { useQuery } from "@tanstack/react-query";
import { resolveMediaUrls } from "../api/media.api";

export function useMediaUrls(ids: string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: ["media", "resolve", key],
    queryFn: () => resolveMediaUrls(ids),
    enabled: ids.length > 0,
    staleTime: 300_000,
    retry: false,
  });
}
