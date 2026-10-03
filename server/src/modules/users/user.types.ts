/** Canonical roles. Backend-enforced; frontend guards mirror them for UX only. */
export const USER_ROLES = ["user", "admin"] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Public account shape. Password hashes / reset tokens NEVER leave the server. */
export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl: string | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
