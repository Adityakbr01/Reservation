import type { NextFunction, Request, Response } from "express";
import { findUserById } from "../modules/users/user.repository";
import { AppError } from "../utils/app-error";
import { asyncHandler } from "../utils/async-handler";
import { verifyAccessToken } from "../utils/jwt";
import type { UserRole } from "../modules/users/user.types";
import type { RequestUser } from "../types/auth";

const BEARER_PREFIX = "Bearer ";

function readBearerToken(req: Request): string {
  const header = req.headers.authorization;
  if (!header || !header.startsWith(BEARER_PREFIX) || header.length <= BEARER_PREFIX.length) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }
  return header.slice(BEARER_PREFIX.length).trim();
}

/**
 * Authenticates the request: verifies the JWT AND reloads the account, so
 * suspended or deleted users lose access immediately (tokens are short-lived
 * and stateless otherwise). Backend remains the authorization boundary;
 * frontend route guards are UX only.
 */
export const authenticate = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const claims = verifyAccessToken(readBearerToken(req));
  const user = await findUserById(claims.sub);
  if (!user || !user.isActive) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }
  (req as Request & { user?: RequestUser }).user = { id: user.id, role: user.role };
  next();
});

/** Role gate. Use after authenticate: authorize("admin"). */
export function authorize(...allowed: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: RequestUser }).user;
    if (!user || !allowed.includes(user.role)) {
      next(new AppError("You do not have permission for this action", 403, "FORBIDDEN"));
      return;
    }
    next();
  };
}

/** Read the authenticated identity inside controllers. Throws 401 if absent. */
export function requireUser(req: Request): RequestUser {
  const user = (req as Request & { user?: RequestUser }).user;
  if (!user) {
    throw new AppError("Authentication required", 401, "UNAUTHORIZED");
  }
  return user;
}
