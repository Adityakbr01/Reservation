import { PrismaClient } from "@prisma/client";
import { env } from "./env";
import { logger } from "./logger";

// Global Prisma Client instance for MySQL
export const prisma = new PrismaClient({
  log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

let isPrismaConnected = false;

export async function connectPrisma(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    isPrismaConnected = true;
    logger.info("MySQL connected via Prisma");
    return true;
  } catch (error) {
    isPrismaConnected = false;
    const message = error instanceof Error ? error.message : String(error);
    logger.error("MySQL connection failed via Prisma", { message });
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
  await prisma.$disconnect();
  isPrismaConnected = false;
  logger.info("MySQL disconnected via Prisma");
}
