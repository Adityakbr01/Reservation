import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type {
  CancelPreview,
  Reservation,
  ReservationDetail,
  ReservationFilters,
} from "../types/reservation.types";

const BASE = "/admin/reservations";

export async function listReservations(filters: ReservationFilters): Promise<Paged<Reservation>> {
  const { data } = await apiClient.get<ApiEnvelope<Reservation[]>>(BASE, { params: filters });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function getReservation(id: string): Promise<ReservationDetail> {
  const response = await apiClient.get<ApiEnvelope<ReservationDetail>>(`${BASE}/${id}`);
  return unwrapResponse(response);
}

export async function previewReservationCancel(id: string): Promise<CancelPreview> {
  const response = await apiClient.get<ApiEnvelope<CancelPreview>>(`${BASE}/${id}/cancel-preview`);
  return unwrapResponse(response);
}

export async function cancelReservation(id: string, reason: string | null): Promise<Reservation> {
  const response = await apiClient.post<ApiEnvelope<Reservation>>(`${BASE}/${id}/cancel`, {
    reason,
  });
  return unwrapResponse(response);
}

export async function checkInReservation(id: string): Promise<Reservation> {
  const response = await apiClient.post<ApiEnvelope<Reservation>>(`${BASE}/${id}/check-in`);
  return unwrapResponse(response);
}

export async function checkOutReservation(id: string): Promise<Reservation> {
  const response = await apiClient.post<ApiEnvelope<Reservation>>(`${BASE}/${id}/check-out`);
  return unwrapResponse(response);
}
