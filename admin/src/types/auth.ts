/**
 * Authenticated account shape returned by login.
 * Mirrors the backend SafeUser contract. Single definition shared by
 * every auth submodule — do not redeclare per module.
 */
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  avatarUrl: string | null;
}
