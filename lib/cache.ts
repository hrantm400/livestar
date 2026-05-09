/**
 * Simple in-memory TTL cache with stale-while-revalidate.
 * Survives the lifetime of a Node process (dev server).
 * For serverless prod, swap the backing Map for KV/Redis.
 */

interface Entry<T> {
  value: T;
  expires: number;
  inflight?: Promise<T>;
}

const store = new Map<string, Entry<unknown>>();

export interface FetchOpts {
  /** TTL in seconds — how long the value is considered fresh. */
  ttl?: number;
  /** Stale-while-revalidate window in seconds beyond TTL. */
  swr?: number;
  /** Force a fresh fetch, ignoring cache. */
  force?: boolean;
}

export async function cached<T>(
  key: string,
  loader: () => Promise<T>,
  opts: FetchOpts = {}
): Promise<T> {
  const ttl = (opts.ttl ?? 300) * 1000;
  const swr = (opts.swr ?? 600) * 1000;
  const now = Date.now();

  const hit = store.get(key) as Entry<T> | undefined;

  if (!opts.force && hit) {
    if (now < hit.expires) {
      return hit.value;
    }
    if (now < hit.expires + swr) {
      // serve stale, refresh in background
      if (!hit.inflight) {
        hit.inflight = loader()
          .then((v) => {
            store.set(key, { value: v, expires: Date.now() + ttl });
            return v;
          })
          .catch((err) => {
            // keep stale on failure
            console.warn(`[cache] revalidate failed for ${key}:`, err);
            hit.inflight = undefined;
            return hit.value;
          });
      }
      return hit.value;
    }
  }

  // miss or expired beyond swr — load fresh
  const inflight = (hit?.inflight as Promise<T> | undefined) ?? loader();
  store.set(key, {
    value: hit?.value as T,
    expires: hit?.expires ?? 0,
    inflight,
  });

  try {
    const value = await inflight;
    store.set(key, { value, expires: Date.now() + ttl });
    return value;
  } catch (err) {
    if (hit) return hit.value; // last-resort stale
    store.delete(key);
    throw err;
  }
}

export function cacheStats() {
  return {
    size: store.size,
    keys: [...store.keys()].slice(0, 50),
  };
}

/**
 * Read-only peek at the cache, no fetch trigger.
 * Returns the value if it's fresh OR within the SWR window; null otherwise.
 */
export function peek<T>(key: string): T | null {
  const hit = store.get(key) as Entry<T> | undefined;
  if (!hit) return null;
  const now = Date.now();
  // accept anything still semantically "alive" (fresh or within typical SWR)
  if (now < hit.expires + 10 * 60 * 1000) return hit.value;
  return null;
}
