import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { Paged } from "@/types/api";
import type { Customer, CustomerDetail, CustomerFilters } from "../types/customer.types";

const BASE = "/admin/users";

export async function listCustomers(filters: CustomerFilters): Promise<Paged<Customer>> {
  const { data } = await apiClient.get<ApiEnvelope<any[]>>(BASE, { params: filters });
  const rawItems = Array.isArray(data.data) ? data.data : [];
  const items: Customer[] = rawItems.map((u: any) => ({
    id: u.id,
    name: u.name ?? "—",
    email: u.email,
    role: u.role ?? "user",
    isActive: Boolean(u.isActive ?? u.is_active),
    is_active: Boolean(u.isActive ?? u.is_active),
    createdAt: u.createdAt ?? u.created_at ?? "",
    created_at: u.createdAt ?? u.created_at ?? "",
    lastLoginAt: u.lastLoginAt ?? u.last_login_at ?? null,
    last_login_at: u.lastLoginAt ?? u.last_login_at ?? null,
  }));

  const total = Number(data.meta?.total ?? items.length);
  const page = Number(data.meta?.page ?? 1);
  const limit = Number(data.meta?.limit ?? 10);
  const totalPages = data.meta?.totalPages ? Number(data.meta.totalPages) : Math.max(1, Math.ceil(total / Math.max(1, limit)));

  return {
    items,
    total,
    page,
    totalPages,
  };
}

export async function getCustomer(id: string): Promise<CustomerDetail> {
  const response = await apiClient.get<ApiEnvelope<any>>(`${BASE}/${id}`);
  const unwrapped = unwrapResponse(response);
  const rawUser = unwrapped.user ?? unwrapped;
  const user: Customer = {
    id: rawUser.id,
    name: rawUser.name ?? "—",
    email: rawUser.email,
    role: rawUser.role ?? "user",
    isActive: Boolean(rawUser.isActive ?? rawUser.is_active),
    is_active: Boolean(rawUser.isActive ?? rawUser.is_active),
    createdAt: rawUser.createdAt ?? rawUser.created_at ?? "",
    created_at: rawUser.createdAt ?? rawUser.created_at ?? "",
    lastLoginAt: rawUser.lastLoginAt ?? rawUser.last_login_at ?? null,
    last_login_at: rawUser.lastLoginAt ?? rawUser.last_login_at ?? null,
  };

  return {
    user,
    bookings: unwrapped.bookings ?? [],
    paymentSummary: unwrapped.paymentSummary ?? { paid: 0, refunded: 0, currency: "GBP" },
    cancellations: unwrapped.cancellations ?? [],
  };
}

export async function setCustomerStatus(id: string, isActive: boolean): Promise<Customer> {
  const response = await apiClient.patch<ApiEnvelope<any>>(`${BASE}/${id}/status`, {
    isActive,
    is_active: isActive,
  });
  const u = unwrapResponse(response);
  return {
    id: u.id,
    name: u.name ?? "",
    email: u.email ?? "",
    role: u.role ?? "user",
    isActive: Boolean(u.isActive ?? u.is_active),
    is_active: Boolean(u.isActive ?? u.is_active),
    createdAt: u.createdAt ?? u.created_at ?? "",
    created_at: u.createdAt ?? u.created_at ?? "",
    lastLoginAt: u.lastLoginAt ?? u.last_login_at ?? null,
    last_login_at: u.lastLoginAt ?? u.last_login_at ?? null,
  };
}
