import { useQuery } from "@tanstack/react-query";
import { fetchHomeSummary } from "../api/home.api";

export function useHomeSummary() {
  return useQuery({
    queryKey: ["home", "summary"],
    queryFn: fetchHomeSummary,
  });
}
