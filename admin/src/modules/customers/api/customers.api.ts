import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type { Customer, CustomerDetail, CustomerFilters } from "../types/customer.types";

const BASE = "/admin/users";

export async function listCustomers(filters: CustomerFilters): Promise<Paged<Customer>> {
  const { data } = await apiClient.get<ApiEnvelope<Customer[]>>(BASE, { params: filters });
  return {
    items: data.data,
    total: data.meta?.total ?? data.data.length,
    page: data.meta?.page ?? 1,
    totalPages: data.meta?.totalPages ?? 1,
  };
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  const response = await apiClient.get<ApiEnvelope<CustomerDetail>>(`${BASE}/${id}`);
  return unwrapResponse(response);
}

export async function setCustomerStatus(id: string, isActive: boolean): Promise<Customer> {
  const response = await apiClient.patch<ApiEnvelope<Customer>>(`${BASE}/${id}/status`, {
    isActive,
  });
  return unwrapResponse(response);
}
