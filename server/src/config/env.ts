import fs from "node:fs";
import dotenv from "dotenv";
import { z } from "zod";

// Load .env explicitly (also works when not running under Bun).
dotenv.config();

// Generated at pack time. Lower priority than this process's env and .env,
// so dashboard env vars always win; empty values fall through to the fallback.
const FALLBACK_ENV_FILE = "deploy.env";
if (fs.existsSync(FALLBACK_ENV_FILE)) {
  const fallback = dotenv.parse(fs.readFileSync(FALLBACK_ENV_FILE));
  for (const [key, value] of Object.entries(fallback)) {
    if (!process.env[key]) process.env[key] = value;
  }
}

// GoDaddy Hosted Database: GoDaddy injects DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT.
// When present, this MUST be the primary DATABASE_URL (overrides deploy.env fallback).
if (process.env.DB_HOST && process.env.DB_USER) {
  const dbUser = encodeURIComponent(process.env.DB_USER);
  const dbPass = encodeURIComponent(process.env.DB_PASSWORD || "");
  const dbHost = process.env.DB_HOST;
  const dbPort = process.env.DB_PORT || "3306";
  const dbName = process.env.DB_NAME || "reservation";
  process.env.DATABASE_URL = `mysql://${dbUser}:${dbPass}@${dbHost}:${dbPort}/${dbName}?connect_timeout=30&pool_timeout=30`;
}

const DEV_JWT_FALLBACK = "dev-only-insecure-secret-change-me";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  MONGODB_URI: z.string().optional(),
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
  // Binary asset storage driver. Supports "local" (PaaS container persistent disk) or "ftp".
  STORAGE_PROVIDER: z.enum(["ftp", "local"]).default("local"),
  // GoDaddy FTP (scoped account jailed to the uploads/ directory).
  // HOST is the FTP hostname from cPanel → "Configure FTP Client", not the website URL.
  GODADDY_FTP_HOST: z.string().trim().min(1).optional(),
  GODADDY_FTP_PORT: z.coerce.number().int().positive().default(21),
  GODADDY_FTP_USER: z.string().trim().min(1).optional(),
  GODADDY_FTP_PASSWORD: z.string().min(1).optional(),
  // Explicit TLS (FTPS). "false" is debugging-only; production stays "true".
  GODADDY_FTP_SECURE: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),
  // TLS SNI/verification name when it differs from GODADDY_FTP_HOST (GoDaddy
  // shared FTP certs are issued for *.prod.<region>.secureserver.net).
  GODADDY_FTP_TLS_SERVERNAME: z.string().trim().min(1).optional(),
  // Public base URL for stored assets, e.g. https://hamptworthstays.com/hamptworthStay/uploads
  ASSETS_BASE_URL: z.string().url().optional(),
  // Optional FTP-root-relative prefix, e.g. "uploads" when the FTP account is
  // jailed to a folder that itself contains an uploads/ directory. Empty = keys
  // start directly with media/ or avatars/. Must match the FTP directory layout.
  GODADDY_FTP_PREFIX: z.string().trim().default(""),
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
  // Fail fast when the FTP driver is selected without its configuration.
  if (env.STORAGE_PROVIDER === "ftp") {
    const missing = [
      !env.GODADDY_FTP_HOST && "GODADDY_FTP_HOST",
      !env.GODADDY_FTP_USER && "GODADDY_FTP_USER",
      !env.GODADDY_FTP_PASSWORD && "GODADDY_FTP_PASSWORD",
      !env.ASSETS_BASE_URL && "ASSETS_BASE_URL",
    ].filter(Boolean);
    if (missing.length > 0) {
      throw new Error(
        `STORAGE_PROVIDER=ftp requires: ${missing.join(", ")} (see migrate-imagekit-to-godaddy.md)`,
      );
    }
  }
  return env;
}

/** Validated environment. Importing this module fails fast on bad config. */
export const env: Env = loadEnv();
export const isProduction: boolean = env.NODE_ENV === "production";
