import type { Request, Response } from "express";
import { rateLimit } from "express-rate-limit";
import { env } from "../config/env";

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many requests, please try again later." },
    });
  },
});

/**
 * Stricter bucket for credential endpoints (register/login/password reset).
 * Fixed values on purpose: brute-force protection must not be loosened via env.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many attempts, please try again later." },
    });
  },
});

/**
 * Test-email bucket (admin template test sends). Explicit recipient only,
 * low volume on purpose so a compromised session cannot mass-mail.
 */
export const testEmailRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: { code: "RATE_LIMITED", message: "Too many test emails, please try again later." },
    });
  },
});
