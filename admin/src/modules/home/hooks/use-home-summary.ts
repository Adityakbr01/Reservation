import { useQuery } from "@tanstack/react-query";
import { homeKeys } from "@/lib/query-keys";
import { fetchHomeSummary } from "../api/home.api";

export function useHomeSummary() {
  return useQuery({
    queryKey: homeKeys.summary(),
    queryFn: fetchHomeSummary,
  });
}
