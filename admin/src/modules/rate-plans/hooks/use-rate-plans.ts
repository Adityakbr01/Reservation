import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { ratePlanKeys } from "@/lib/query-keys";
import { createRatePlan, getRatePlan, listRatePlans, updateRatePlan } from "../api/rate-plans.api";
import type { RatePlanFilters } from "../types/rate-plan.types";

export function useRatePlans(filters: RatePlanFilters) {
  return useQuery({
    queryKey: ratePlanKeys.list(filters),
    queryFn: () => listRatePlans(filters),
  });
}

export function useRatePlan(id: string, enabled = true) {
  return useQuery({
    queryKey: ratePlanKeys.detail(id),
    queryFn: () => getRatePlan(id),
    enabled: enabled && id.length > 0,
  });
}

export function useCreateRatePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createRatePlan,
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ratePlanKeys.all });
      toast.success(`“${created.name}” created`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useUpdateRatePlan(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Parameters<typeof updateRatePlan>[1]) => updateRatePlan(id, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ratePlanKeys.all });
      toast.success("Rate plan updated");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
