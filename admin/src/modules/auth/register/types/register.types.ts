import type { AuthUser } from "@/types/auth";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  user: AuthUser;
  token: string;
}
