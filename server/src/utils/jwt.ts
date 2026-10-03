import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AppError } from "./app-error";
import { USER_ROLES } from "../modules/users/user.types";
import type { UserRole } from "../modules/users/user.types";

export interface AccessTokenClaims {
  sub: string;
  role: UserRole;
}

/** Short-lived access token. Never put secrets or PII beyond id/role inside. */
export function signAccessToken(userId: string, role: UserRole): string {
  return jwt.sign({ role } satisfies Partial<AccessTokenClaims>, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

/** Verify a Bearer token. Throws 401 AppError when missing/invalid/expired. */
export function verifyAccessToken(token: string): AccessTokenClaims {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    // Reject forged or stale roles (e.g. tokens issued before a role-model
    // change). Forces re-login instead of letting an unknown role flow inward.
    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      !USER_ROLES.includes(decoded.role as UserRole)
    ) {
      throw new AppError("Invalid or expired token", 401, "TOKEN_INVALID");
    }
    return { sub: decoded.sub, role: decoded.role as UserRole };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("Invalid or expired token", 401, "TOKEN_INVALID");
  }
}
