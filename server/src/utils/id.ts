import { randomBytes } from "node:crypto";

/**
 * Generates a 24-character hex string compatible with MongoDB ObjectId format.
 * Preserves cross-system string identifier conventions for MySQL schema.
 */
export function newId(): string {
  return randomBytes(12).toString("hex");
}
