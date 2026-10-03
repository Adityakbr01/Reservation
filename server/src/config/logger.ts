import winston from "winston";
import { env } from "./env";

const inner = winston.createLogger({
  level: env.LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: { service: "reservation-api", env: env.NODE_ENV },
  transports: [new winston.transports.Console()],
});

type Meta = Record<string, unknown>;

/**
 * Small structured-logging facade over Winston.
 * Accepts logger.info("message") or logger.info({ ...fields }, "message")
 * so call sites stay uniform across the codebase.
 */
function log(level: "info" | "warn" | "error", message: string, meta?: Meta): void {
  if (meta === undefined) {
    inner.log(level, message);
  } else {
    inner.log(level, message, meta);
  }
}

export const logger = {
  info: (message: string, meta?: Meta): void => log("info", message, meta),
  warn: (message: string, meta?: Meta): void => log("warn", message, meta),
  error: (message: string, meta?: Meta): void => log("error", message, meta),
};
