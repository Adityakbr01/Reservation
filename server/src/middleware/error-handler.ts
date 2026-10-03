import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isProduction } from "../config/env";
import { logger } from "../config/logger";
import { AppError } from "../utils/app-error";

interface ErrorBody {
  success: false;
  error: { code: string; message: string; details?: unknown };
}

/**
 * Centralized error handler. Emits the documented contract:
 * { success: false, error: { code, message } }.
 * Never leaks stacks, DB internals, paths, or secrets.
 */
export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  let status = 500;
  let code = "INTERNAL_ERROR";
  let message = "Something went wrong";
  let details: unknown;

  if (error instanceof AppError) {
    status = error.status;
    code = error.code;
    message = error.message;
    details = error.details;
  } else if (error instanceof ZodError) {
    status = 400;
    code = "VALIDATION_ERROR";
    message = "Validation failed";
    details = error.issues;
  } else if (error instanceof Error) {
    message = isProduction ? "Something went wrong" : error.message;
  }

  logger.error(status >= 500 ? "request failed" : "request error", { code, status });

  const body: ErrorBody = { success: false, error: { code, message } };
  if (details !== undefined) {
    body.error.details = details;
  }
  res.status(status).json(body);
}
