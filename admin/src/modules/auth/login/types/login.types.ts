import type { AuthUser } from "@/types/auth";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: AuthUser;
  token: string;
}
