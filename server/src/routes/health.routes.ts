import { Router } from "express";
import type { Request, Response } from "express";
import { cacheHealth } from "../config/cache";
import { databaseHealth, isDatabaseConnected } from "../config/database";
import { asyncHandler } from "../utils/async-handler";

export const healthRouter = Router();

healthRouter.get("/", (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: "reservation-api",
      status: "ok",
      health: "/health",
      ready: "/ready",
    },
  });
});

/** Liveness: always 200 while the process serves; reports dependency states. */
healthRouter.get(
  "/health",
  asyncHandler(async (_req: Request, res: Response) => {
    res.json({
      success: true,
      data: {
        status: "ok",
        uptimeSeconds: Math.floor(process.uptime()),
        checks: {
          database: databaseHealth(),
          mysql: databaseHealth(),
          cache: cacheHealth(),
        },
      },
    });
  }),
);

/** Readiness: 200 only when MongoDB is reachable, 503 otherwise. */
healthRouter.get(
  "/ready",
  asyncHandler(async (_req: Request, res: Response) => {
    if (!isDatabaseConnected()) {
      res.status(503).json({
        success: false,
        error: { code: "NOT_READY", message: "Dependencies are not ready" },
      });
      return;
    }
    res.json({ success: true, data: { ready: true } });
  }),
);
