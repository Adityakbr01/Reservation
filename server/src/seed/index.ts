import { ensureProperty } from "../modules/properties/property.service";
import { seedAdminFromEnv } from "./admin.seed";
import { seedContent } from "./content.seed";

/**
 * Boot-time data seeding, called once from server.ts.
 * Best-effort by contract: individual seeds log and skip on missing
 * config; the caller catches anything unexpected so seeding never
 * takes the API down.
 */
export async function runStartupSeeds(): Promise<void> {
  await seedAdminFromEnv();
  await ensureProperty();
  await seedContent();
}
