import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type {
  AdminPayment,
  AdminRefund,
  PaymentFilters,
  RefundFilters,
} from "../types/payment.types";

export async function listAdminPayments(filters: PaymentFilters): Promise<Paged<AdminPayment>> {
  const { data } = await apiClient.get<ApiEnvelope<AdminPayment[]>>("/admin/payments", {
    params: filters,
  });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function listAdminRefunds(filters: RefundFilters): Promise<Paged<AdminRefund>> {
  const { data } = await apiClient.get<ApiEnvelope<AdminRefund[]>>("/admin/refunds", {
    params: filters,
  });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function refundBookingPayment(
  bookingId: string,
  amount: number | null,
): Promise<AdminRefund> {
  const response = await apiClient.post<ApiEnvelope<AdminRefund>>(
    `/admin/reservations/${bookingId}/refund`,
    amount === null ? {} : { amount },
  );
  return unwrapResponse(response);
}
