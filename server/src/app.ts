import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFound } from "./middleware/not-found";
import { globalRateLimiter } from "./middleware/rate-limit";
import { requestLogger } from "./middleware/request-logger";
import { adminUsersRouter, authRouter } from "./modules/auth/auth.routes";
import { healthRouter } from "./routes/health.routes";

export function createApp() {
  const app = express();

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: [env.CLIENT_URL, env.ADMIN_URL], credentials: true }));
  app.use(requestLogger);

  // IMPORTANT: when the Stripe webhook route lands, mount it HERE with
  // express.raw({ type: "application/json" }) BEFORE express.json().
  // JSON parsing the webhook body breaks Stripe signature verification.

  app.use(express.json({ limit: "1mb" }));
  app.use(globalRateLimiter);

  app.use(healthRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/admin/users", adminUsersRouter);
  // Future domain routers mount under /api/v1 (see docs 05_DATABASE_AND_API_SPEC).

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

export type App = ReturnType<typeof createApp>;
