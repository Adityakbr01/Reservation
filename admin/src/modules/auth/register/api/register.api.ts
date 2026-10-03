import { apiClient } from "@/lib/axios";
import type { RegisterPayload, RegisterResponse } from "../types/register.types";

export async function register(payload: RegisterPayload): Promise<RegisterResponse> {
  const { data } = await apiClient.post<RegisterResponse>("/auth/register", payload);
  return data;
}
