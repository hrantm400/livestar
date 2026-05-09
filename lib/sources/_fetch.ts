/**
 * Hardened JSON fetch wrapper with timeout, retries, UA, and graceful errors.
 * All source modules should go through this.
 */

const UA = process.env.STELLAR_USER_AGENT || "stellar-app/0.1";

export interface FetchJsonOpts {
  timeoutMs?: number;
  retries?: number;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  /** If true, accepts text/html or text/plain too (some sources lie). */
  permissive?: boolean;
}

export class SourceError extends Error {
  constructor(public source: string, public status: number, msg: string) {
    super(msg);
    this.name = "SourceError";
  }
}

export async function fetchJson<T = unknown>(
  url: string,
  opts: FetchJsonOpts = {}
): Promise<T | null> {
  const timeoutMs = opts.timeoutMs ?? 6_000;
  const retries = opts.retries ?? 1;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    if (opts.signal) {
      opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    try {
      const res = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": UA, Accept: "application/json", ...opts.headers },
        cache: "no-store",
      });
      clearTimeout(t);

      if (!res.ok) {
        if (res.status >= 500 && attempt < retries) continue;
        return null;
      }

      const txt = await res.text();
      if (!txt) return null;
      try {
        return JSON.parse(txt) as T;
      } catch {
        if (opts.permissive) return null;
        return null;
      }
    } catch (err) {
      clearTimeout(t);
      if (attempt < retries) continue;
      return null;
    }
  }
  return null;
}

/**
 * Naive token bucket — limits requests per second per host.
 * Used to respect Nominatim's 1 req/s policy.
 */
const lastByHost = new Map<string, number>();

export async function rateLimit(host: string, minIntervalMs: number): Promise<void> {
  const now = Date.now();
  const last = lastByHost.get(host) ?? 0;
  const wait = Math.max(0, last + minIntervalMs - now);
  lastByHost.set(host, now + wait);
  if (wait > 0) {
    await new Promise((r) => setTimeout(r, wait));
  }
}
