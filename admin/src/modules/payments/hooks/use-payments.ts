import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/api-client";
import { adminPaymentKeys, refundKeys } from "@/lib/query-keys";
import { listAdminPayments, listAdminRefunds, refundBookingPayment } from "../api/payments.api";
import type { PaymentFilters, RefundFilters } from "../types/payment.types";

export function useAdminPayments(filters: PaymentFilters) {
  return useQuery({
    queryKey: adminPaymentKeys.list(filters),
    queryFn: () => listAdminPayments(filters),
  });
}

export function useAdminRefunds(filters: RefundFilters) {
  return useQuery({
    queryKey: refundKeys.list(filters),
    queryFn: () => listAdminRefunds(filters),
  });
}

export function useRefundBooking(bookingId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (amount: number | null) => refundBookingPayment(bookingId, amount),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminPaymentKeys.all });
      void queryClient.invalidateQueries({ queryKey: refundKeys.all });
      toast.success("Refund initiated — Stripe confirmation follows by webhook");
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error));
    },
  });
}
