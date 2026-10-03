import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { LoginPayload, LoginResponse } from "../types/login.types";

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await apiClient.post<ApiEnvelope<LoginResponse>>("/auth/login", payload);
  return unwrapResponse(response);
}
