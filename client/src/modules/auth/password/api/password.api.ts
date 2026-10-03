import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { ForgotPasswordPayload, ResetPasswordPayload } from "../types/password.types";

export async function forgotPassword(payload: ForgotPasswordPayload): Promise<{ message: string }> {
  const response = await apiClient.post<ApiEnvelope<{ message: string }>>(
    "/auth/forgot-password",
    payload,
  );
  return unwrapResponse(response);
}

export async function resetPassword(payload: ResetPasswordPayload): Promise<{ message: string }> {
  const response = await apiClient.post<ApiEnvelope<{ message: string }>>(
    "/auth/reset-password",
    payload,
  );
  return unwrapResponse(response);
}
