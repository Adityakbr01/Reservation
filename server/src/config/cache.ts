import NodeCache from "node-cache";
import { env } from "./env";

/**
 * Centralized short-lived cache: room holds, locks, lookup caching.
 *
 * Foundation uses in-process Node-Cache (single instance, zero infra —
 * an in-memory store needs no URL). If distributed coordination across
 * instances is ever needed, replace this module's internals behind the
 * same exported surface. MongoDB remains the durable source of truth:
 * every inventory mutation must re-validate there, never trust cache alone.
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
