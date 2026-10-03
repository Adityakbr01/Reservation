import NodeCache from "node-cache";
import { env } from "./env";

/**
 * Centralized short-lived cache: room holds, locks, lookup caching.
 *
 * Foundation uses in-process Node-Cache (single instance, zero infra).
 * The docs describe Redis for distributed coordination across instances;
 * if/when that is needed, replace this module's internals behind the same
 * exported surface (NODE_CACHE_URL in .env.example is reserved for that).
 * MongoDB remains the durable source of truth: every inventory mutation
 * must re-validate there, never trust cache alone.
 */
const cache = new NodeCache({
  stdTTL: env.CACHE_TTL_SECONDS,
  checkperiod: 60,
  useClones: false,
});

export const cacheStore = cache;

export function cacheHealth(): { store: string; keys: number; hits: number; misses: number } {
  const stats = cache.getStats();
  return { store: "node-cache", keys: stats.keys, hits: stats.hits, misses: stats.misses };
}

export function closeCache(): void {
  cache.close();
}
