import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { isDatabaseConnected } from "../config/database";
import { logger } from "../config/logger";
import { createUser, findUserByEmail } from "../modules/users/user.repository";

const BCRYPT_ROUNDS = 10;

export type AdminSeedResult = "created" | "exists" | "skipped";

/**
 * Boot-time staff admin seed (the admin frontend has no registration UI).
 * Creates the ADMIN_EMAIL account with the admin role ONLY when that email
 * is not registered yet. Existing accounts are never modified — passwords
 * and roles are never overwritten on boot.
 */
export async function seedAdminFromEnv(): Promise<AdminSeedResult> {
  const email = env.ADMIN_EMAIL;
  const password = env.ADMIN_PASSWORD;
  if (!email || !password) {
    logger.warn("Admin seed skipped: set ADMIN_EMAIL and ADMIN_PASSWORD to create a staff admin");
    return "skipped";
  }
  if (!isDatabaseConnected()) {
    logger.warn("Admin seed skipped: database is not connected");
    return "skipped";
  }
  const existing = await findUserByEmail(email);
  if (existing) {
    logger.info("Admin seed already present, leaving the existing account untouched");
    return "exists";
  }
  const name = env.ADMIN_NAME.trim() === "" ? "Administrator" : env.ADMIN_NAME.trim();
  await createUser({
    name,
    email,
    passwordHash: await bcrypt.hash(password, BCRYPT_ROUNDS),
    role: "admin",
  });
  logger.info("Staff admin seeded from environment");
  return "created";
}
