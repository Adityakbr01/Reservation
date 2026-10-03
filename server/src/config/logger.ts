import winston from "winston";
import { env } from "./env";

const prettyPrint = winston.format.printf((info) => {
  const { timestamp, level, message, service, env: envName, ...meta } = info;
  const fields = Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : "";
  return `${String(timestamp)} [${String(service)}:${String(envName)}] ${String(level)}: ${String(message)}${fields}`;
});

const inner = winston.createLogger({
  level: env.LOG_LEVEL,
  // Human-readable colorized logs locally; machine-readable JSON in production.
  format:
    env.NODE_ENV === "production"
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.errors({ stack: true }),
          winston.format.json(),
        )
      : winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: "HH:mm:ss" }),
          winston.format.errors({ stack: true }),
          prettyPrint,
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
