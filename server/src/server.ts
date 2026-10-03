import type { Server } from "node:http";
import { createApp } from "./app";
import { closeCache } from "./config/cache";
import { connectDatabase, disconnectDatabase } from "./config/database";
import { env } from "./config/env";
import { logger } from "./config/logger";

async function boot(): Promise<void> {
  // Degraded boot by design: DB failure is logged and /ready reports 503,
  // but the process still serves /health so the failure is observable.
  await connectDatabase();

  const app = createApp();
  const server: Server = app.listen(env.PORT, () => {
    logger.info(`API listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string): void => {
    logger.info(`Received ${signal}, shutting down gracefully`);
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
    // Force-exit if connections refuse to drain.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

boot().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  logger.error("Failed to boot API", { message });
  process.exit(1);
});
