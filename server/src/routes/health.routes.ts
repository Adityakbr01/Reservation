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

/** Readiness: 200 only when database is reachable, 503 otherwise. */
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

/** Live network & database diagnostics for GoDaddy container environment */
healthRouter.get(
  "/api/diagnose",
  asyncHandler(async (_req: Request, res: Response) => {
    const results: Record<string, any> = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      platform: process.platform,
    };

    // 1. Container public outbound IP
    try {
      const ipRes = await fetch("https://api.ipify.org?format=json", {
        signal: AbortSignal.timeout(3000),
      });
      const data = (await ipRes.json()) as { ip: string };
      results.containerPublicIp = data.ip;
    } catch (e: any) {
      results.containerPublicIp = "failed: " + e.message;
    }

    // 2. DNS resolution for cPanel host
    try {
      const dns = await import("node:dns/promises");
      results.dnsKms = await dns.lookup("kms.596.mytemp.website");
    } catch (e: any) {
      results.dnsKms = "failed: " + e.message;
    }

    // 3. Raw TCP socket tests to different ports
    const testPort = (host: string, port: number) => {
      return new Promise((resolve) => {
        import("node:net").then(({ default: net }) => {
          const s = net.createConnection({ host, port });
          s.setTimeout(3000);
          s.on("connect", () => {
            s.destroy();
            resolve("OPEN");
          });
          s.on("timeout", () => {
            s.destroy();
            resolve("TIMED_OUT");
          });
          s.on("error", (err) => {
            resolve("ERROR: " + err.message);
          });
        });
      });
    };

    results.connectivity = {
      httpGooglePort80: await testPort("google.com", 80),
      httpsGooglePort443: await testPort("google.com", 443),
      cpanelHttpPort80: await testPort("97.74.205.180", 80),
      cpanelHttpsPort443: await testPort("97.74.205.180", 443),
      cpanelAdminPort2083: await testPort("97.74.205.180", 2083),
      mysqlPort3306ToIp: await testPort("97.74.205.180", 3306),
      mysqlPort3306ToHost: await testPort("kms.596.mytemp.website", 3306),
    };

    res.json({
      success: true,
      diagnostics: results,
    });
  }),
);

