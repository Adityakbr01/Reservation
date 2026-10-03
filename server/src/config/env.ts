import dotenv from "dotenv";
import { z } from "zod";

// Load .env explicitly (also works when not running under Bun).
dotenv.config();

const DEV_JWT_FALLBACK = "dev-only-insecure-secret-change-me";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  MONGODB_URI: z.string().min(1).default("mongodb://127.0.0.1:27017/reservation"),
  JWT_SECRET: z.string().min(1).default(DEV_JWT_FALLBACK),
  JWT_EXPIRES_IN: z.string().min(1).default("7d"),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  ADMIN_URL: z.string().url().default("http://localhost:5174"),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().min(1).default("no-reply@example.com"),
  EMAIL_REPLY_TO: z.string().optional(),
  IMAGEKIT_PUBLIC_KEY: z.string().optional(),
  IMAGEKIT_PRIVATE_KEY: z.string().optional(),
  IMAGEKIT_URL_ENDPOINT: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration: ${details}`);
  }
  const env = parsed.data;
  if (env.NODE_ENV === "production" && env.JWT_SECRET === DEV_JWT_FALLBACK) {
    throw new Error("JWT_SECRET must be set to a strong value in production.");
  }
  return env;
}

/** Validated environment. Importing this module fails fast on bad config. */
export const env: Env = loadEnv();
export const isProduction: boolean = env.NODE_ENV === "production";
