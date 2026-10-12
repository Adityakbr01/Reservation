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
  // Optional staff-admin seed (the admin frontend has no registration UI).
  // Absent values skip seeding; present-but-malformed values fail boot fast.
  ADMIN_NAME: z.string().trim().max(80).default("Administrator"),
  ADMIN_EMAIL: z.string().trim().toLowerCase().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).max(128).optional(),
  CLIENT_URL: z.string().url().default("http://localhost:5173"),
  ADMIN_URL: z.string().url().default("http://localhost:5174"),
  // Extra allowed browser origins (comma-separated) for production, e.g.
  // "https://hotel.example.com,https://www.hotel.example.com".
  // On single-domain hosts (GoDaddy shared) the site and the API share one
  // origin — put that domain in CLIENT_URL/ADMIN_URL and/or here.
  EXTRA_ORIGINS: z.string().trim().default(""),
  // Behind GoDaddy/cPanel (Passenger + proxy) set "true" so secure cookies,
  // client IPs and rate limiting see the real requester (one proxy hop).
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().min(1).default("no-reply@voiceact.tech"),
  EMAIL_REPLY_TO: z.string().optional(),
  // Absolute https logo URL for the email header (e.g. a hosted logo.webp).
  // Relative paths never render in inboxes; unset keeps the text lockup.
  EMAIL_LOGO_URL: z.string().trim().max(500).optional(),
  ADMIN_NOTIFICATION_EMAIL: z.string().trim().toLowerCase().email().optional(),
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
