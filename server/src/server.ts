import type { Server } from "node:http";
import { createApp } from "./app";
import { closeCache } from "./config/cache";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env, isProduction } from "./config/env";
import { logger } from "./config/logger";
import { runStartupSeeds } from "./seed";

async function boot(): Promise<void> {
  // Degraded boot by design: DB failure is logged and /ready reports 503,
  // but the process still serves /health so the failure is observable.
  await connectDatabase();

  // Startup seeds (admin account, property singleton). Failures are logged
  // loudly but never take the API down.
  try {
    await runStartupSeeds();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error("Boot seeding failed", { message });
  }

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    // Drop idle keep-alive connections so close() does not wait on them.
    // The ?. guard keeps this safe on runtimes without the API.
    server.closeIdleConnections?.();
    server.close(() => {
      void (async () => {
        try {
          await disconnectDatabase();
        } finally {
          closeCache();
          process.exit(0);
        }
      })();
    });
    // Force-exit if connections refuse to drain. Non-zero in production so
    // orchestrators can tell a hung shutdown apart from a clean one.
    setTimeout(() => {
      logger.warn("Shutdown timed out, forcing exit");
      process.exit(isProduction ? 1 : 0);
    }, 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

boot().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error("Failed to boot API", { message });
  process.exit(1);
});
