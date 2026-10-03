import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "./logger";

/**
 * Durable source of truth. Holds/locks live in cache; correctness lives here.
 *
 * Runtime note: the MongoDB driver must resolve bson < 7.3 (pinned via the
 * "overrides" field in package.json). bson >= 7.3 probes
 * v8.startupSnapshot.isBuildingSnapshot() at import time and Bun < 1.4
 * throws ERR_NOT_IMPLEMENTED instead of returning false, which crashes the
 * import. Revisit the pin when Bun >= 1.4 ships the fix or bson guards the
 * probe (upstream: oven-sh/bun#32501, mongodb/js-bson#903).
 */

/** Durable source of truth. Holds/locks live in cache; correctness lives here. */
export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  mongoose.set("strictQuery", true);
  try {
    await mongoose.connect(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    logger.info("MongoDB connected");
  } catch (error) {
    // Degraded boot: the API still serves /health so the failure is observable.
    // /ready reports 503 until MongoDB is reachable.
    const message = error instanceof Error ? error.message : String(error);
    logger.error("MongoDB connection failed — running degraded", { message });
  }
}

export function isDatabaseConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export function databaseHealth(): { state: "connected" | "disconnected" } {
  return { state: isDatabaseConnected() ? "connected" : "disconnected" };
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    logger.info("MongoDB disconnected");
  }
}
