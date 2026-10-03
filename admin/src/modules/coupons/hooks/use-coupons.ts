import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { couponKeys } from "@/lib/query-keys";
import { createCoupon, getCoupon, listCoupons, updateCoupon } from "../api/coupons.api";
import type {
  CouponFilters,
  CreateCouponPayload,
  UpdateCouponPayload,
} from "../types/coupon.types";

export function useCoupons(filters: CouponFilters) {
  return useQuery({
    queryKey: couponKeys.list(filters),
    queryFn: () => listCoupons(filters),
  });
}

export function useCoupon(id: string) {
  return useQuery({
    queryKey: couponKeys.detail(id),
    queryFn: () => getCoupon(id),
    enabled: id.length > 0,
  });
}

export function useCreateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateCouponPayload) => createCoupon(payload),
    onSuccess: (coupon) => {
      void queryClient.invalidateQueries({ queryKey: couponKeys.all });
      toast.success(`Coupon ${coupon.code} created`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}

export function useUpdateCoupon() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCouponPayload }) =>
      updateCoupon(id, payload),
    onSuccess: (coupon) => {
      void queryClient.invalidateQueries({ queryKey: couponKeys.all });
      toast.success(`Coupon ${coupon.code} updated`);
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
