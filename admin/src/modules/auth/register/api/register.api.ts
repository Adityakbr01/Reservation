import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { RegisterPayload, RegisterResponse } from "../types/register.types";

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const response = await apiClient.post<ApiEnvelope<RegisterResponse>>("/auth/register", payload);
  return unwrapResponse(response);
}
