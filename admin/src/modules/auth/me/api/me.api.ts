import { apiClient, unwrapResponse } from "@/lib/api-client";
import type { ApiEnvelope } from "@/lib/api-client";
import type { AuthUser } from "@/types/auth";
import type { ChangePasswordPayload, SetPasswordPayload, UpdateMePayload } from "../types/me.types";

export async function fetchMe(): Promise<AuthUser> {
  const response = await apiClient.get<ApiEnvelope<AuthUser>>("/auth/me");
  return unwrapResponse(response);
}

export async function updateMe(payload: UpdateMePayload): Promise<AuthUser> {
  const form = new FormData();
  if (payload.name !== undefined) form.append("name", payload.name);
  if (payload.avatar) form.append("avatar", payload.avatar);
  const response = await apiClient.patchForm<ApiEnvelope<AuthUser>>("/auth/me", form);
  return unwrapResponse(response);
}

export async function changePassword(
  payload: ChangePasswordPayload,
): Promise<{ message: string }> {
  const response = await apiClient.post<ApiEnvelope<{ message: string }>>(
    "/auth/change-password",
    payload,
  );
  return unwrapResponse(response);
}

export async function setPassword(
  payload: SetPasswordPayload,
): Promise<{ message: string }> {
  const response = await apiClient.post<ApiEnvelope<{ message: string }>>(
    "/auth/set-password",
    payload,
  );
  return unwrapResponse(response);
}
