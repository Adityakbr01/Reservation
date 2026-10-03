import { apiClient } from "@/lib/axios";
import type { HomeSummary } from "../types/home.types";

export async function fetchHomeSummary(): Promise<HomeSummary> {
  const { data } = await apiClient.get<HomeSummary>("/home/summary");
  return data;
}
