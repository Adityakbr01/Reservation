import { PrismaClient } from "@prisma/client";
import { env } from "./env";
import { logger } from "./logger";

const logOptions: any[] = env.NODE_ENV === "development" ? ["warn", "error"] : ["error"];

let activePrisma = new PrismaClient({
  log: logOptions as any,
});

// Proxy delegating all calls to activePrisma so fallback instances seamlessly take over
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    const val = (activePrisma as any)[prop];
    return typeof val === "function" ? val.bind(activePrisma) : val;
  },
});

let isPrismaConnected = false;

export async function connectPrisma(): Promise<boolean> {
  try {
    await activePrisma.$queryRaw`SELECT 1`;
    isPrismaConnected = true;
    logger.info("MySQL connected via Prisma");
    return true;
  } catch (error) {
    const initialMessage = error instanceof Error ? error.message : String(error);
    logger.warn("Initial MySQL connection failed via Prisma", { message: initialMessage });

    const rawUrl = process.env.DATABASE_URL || "";
    if (rawUrl) {
      const candidates: string[] = [];

      // Helper to ensure sslmode=disable and reasonable timeout for MariaDB/cPanel
      const normalizeParams = (u: string) => {
        let res = u;
        if (!res.includes("sslmode=")) {
          res += (res.includes("?") ? "&" : "?") + "sslmode=disable";
        }
        if (!res.includes("connect_timeout=")) {
          res += (res.includes("?") ? "&" : "?") + "connect_timeout=30";
        }
        if (!res.includes("pool_timeout=")) {
          res += (res.includes("?") ? "&" : "?") + "pool_timeout=30";
        }
        return res;
      };

      // 0. GoDaddy Hosted Database from injected environment variables:
      if (process.env.DB_HOST && process.env.DB_USER) {
        const u = encodeURIComponent(process.env.DB_USER);
        const p = encodeURIComponent(process.env.DB_PASSWORD || "");
        const h = process.env.DB_HOST;
        const port = process.env.DB_PORT || "3306";
        const d = process.env.DB_NAME || "reservation";
        candidates.push(normalizeParams(`mysql://${u}:${p}@${h}:${port}/${d}`));
      }

      // 1. Try initial URL with normalized params
      const normalizedInitial = normalizeParams(rawUrl);
      if (normalizedInitial !== rawUrl) {
        candidates.push(normalizedInitial);
      }

      // 2. GoDaddy cPanel hosts: domain, direct IP, and secureserver hostname
      const remoteHosts = [
        "kms.596.mytemp.website:3306",
        "97.74.205.180:3306",
        "p3plzcpnl508814.prod.phx3.secureserver.net:3306",
      ];
      for (const h of remoteHosts) {
        const candidate = normalizeParams(rawUrl.replace(/@[^/]+(:[0-9]+)?\//, `@${h}/`));
        if (!candidates.includes(candidate)) {
          candidates.push(candidate);
        }
      }

      // 3. Localhost fallback
      const localCandidate = normalizeParams(rawUrl.replace(/@[^/]+(:[0-9]+)?\//, "@localhost:3306/"));
      if (!candidates.includes(localCandidate)) {
        candidates.push(localCandidate);
      }

      // 4. Try standard cPanel Linux UNIX sockets if on local VM
      const socketPaths = [
        "/var/lib/mysql/mysql.sock",
        "/tmp/mysql.sock",
        "/var/run/mysqld/mysqld.sock",
      ];
      for (const sock of socketPaths) {
        const base = rawUrl.replace(/@[^/]+(:[0-9]+)?\//, "@localhost/");
        const sep = base.includes("?") ? "&" : "?";
        candidates.push(`${base}${sep}socket=${sock}&sslmode=disable`);
      }

      for (const candidateUrl of candidates) {
        try {
          const candidatePrisma = new PrismaClient({
            datasources: { db: { url: candidateUrl } },
            log: logOptions as any,
          });
          await candidatePrisma.$queryRaw`SELECT 1`;
          activePrisma = candidatePrisma;
          isPrismaConnected = true;
          logger.info("MySQL connected via fallback", {
            target: candidateUrl.replace(/:([^@]+)@/, ":***@"),
          });
          return true;
        } catch {
          // continue probing next candidate
        }
      }
    }

    isPrismaConnected = false;
    logger.error("MySQL connection failed via Prisma (all candidates exhausted)", {
      message: initialMessage,
      hint: "If using GoDaddy cPanel MySQL, please ensure '%' is added to cPanel > Remote MySQL so external app containers can connect.",
    });
    return false;
  }
}

/** Durable source of truth. Holds/locks live in cache; correctness lives here. */
export async function connectDatabase(): Promise<void> {
  await connectPrisma();
}

export function isDatabaseConnected(): boolean {
  return isPrismaConnected;
}

export function databaseHealth(): { state: "connected" | "disconnected"; mysql: boolean } {
  return {
    state: isPrismaConnected ? "connected" : "disconnected",
    mysql: isPrismaConnected,
  };
}

export async function disconnectDatabase(): Promise<void> {
  await activePrisma.$disconnect();
  isPrismaConnected = false;
  logger.info("MySQL disconnected via Prisma");
}
