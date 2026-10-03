import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type { AdminNotification, NotificationFilters } from "../types/notification.types";

const BASE = "/admin/notifications";

export async function listNotifications(
  filters: NotificationFilters,
): Promise<Paged<AdminNotification>> {
  const { data } = await apiClient.get<ApiEnvelope<AdminNotification[]>>(BASE, {
    params: filters,
  });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function retryNotification(id: string): Promise<AdminNotification> {
  const response = await apiClient.post<ApiEnvelope<AdminNotification>>(`${BASE}/${id}/retry`);
  return unwrapResponse(response);
}
