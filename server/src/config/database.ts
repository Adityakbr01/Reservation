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

function summarizeMongoUri(uri: string): {
  scheme: string;
  hosts: string;
  database: string;
  replicaSet?: string;
  tls?: string;
  authSource?: string;
} {
  const scheme = uri.startsWith("mongodb+srv://") ? "srv" : "direct";
  const withoutScheme = uri.replace(/^mongodb(\+srv)?:\/\//, "");
  const at = withoutScheme.lastIndexOf("@");
  const hostAndDb = at >= 0 ? withoutScheme.slice(at + 1) : withoutScheme;
  const [hostPart, query = ""] = hostAndDb.split("?");
  const slash = hostPart.indexOf("/");
  const hosts = slash >= 0 ? hostPart.slice(0, slash) : hostPart;
  const database = slash >= 0 ? hostPart.slice(slash + 1) : "";
  const params = new URLSearchParams(query);
  return {
    scheme,
    hosts,
    database,
    replicaSet: params.get("replicaSet") ?? undefined,
    tls: params.get("tls") ?? params.get("ssl") ?? undefined,
    authSource: params.get("authSource") ?? undefined,
  };
}

function describeMongoError(error: unknown): string | undefined {
  const reason =
    typeof error === "object" && error !== null && "reason" in error
      ? (error as { reason?: unknown }).reason
      : undefined;
  if (reason instanceof Error) return reason.message;
  if (reason && typeof reason === "object" && "servers" in reason) {
    const servers = (
      reason as { servers?: Map<string, { error?: Error; type?: string }> }
    ).servers;
    if (servers && typeof servers.entries === "function") {
      return [...servers.entries()]
        .map(
          ([address, desc]) =>
            `${address} => ${desc.error?.message ?? desc.type ?? "unknown"}`,
        )
        .join(" | ");
    }
  }
  return undefined;
}

/** Durable source of truth. Holds/locks live in cache; correctness lives here. */
export async function connectDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  mongoose.set("strictQuery", true);
  const target = summarizeMongoUri(env.MONGODB_URI);
  logger.info("MongoDB target", target);
  try {
    // Capped pool: M0 allows 500 connections cluster-wide and this API is
    // the only writer. One dev server + probes never need more than a
    // handful; an uncapped default (100) plus hot-reload churn can exhaust
    // the cluster and surface as TLS/handshake failures on new connects.
    await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10,
    });
    logger.info("MongoDB connected");
  } catch (error) {
    // Degraded boot: the API still serves /health so the failure is observable.
    // /ready reports 503 until MongoDB is reachable.
    const message = error instanceof Error ? error.message : String(error);
    const name = error instanceof Error ? error.name : typeof error;
    const reason = describeMongoError(error);
    logger.error("MongoDB connection failed — running degraded", {
      name,
      message,
      ...(reason ? { reason } : {}),
      ...target,
    });
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
