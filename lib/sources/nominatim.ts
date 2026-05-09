import { cached } from "../cache";
import { fetchJson, rateLimit } from "./_fetch";

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  type?: string;
  class?: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
  display: string;
}

/**
 * Nominatim asks for max 1 req/s and a real User-Agent. We rate-limit and cache aggressively.
 */
export async function geocode(query: string): Promise<GeoPoint | null> {
  if (!query?.trim()) return null;
  return cached(
    `geo:${query.toLowerCase()}`,
    async () => {
      await rateLimit("nominatim.openstreetmap.org", 1100);
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        query
      )}&format=json&limit=1`;
      const arr = await fetchJson<NominatimResult[]>(url, {
        headers: { "Accept-Language": "en" },
        timeoutMs: 8000,
      });
      const r = arr?.[0];
      if (!r) return null;
      return {
        lat: parseFloat(r.lat),
        lng: parseFloat(r.lon),
        display: r.display_name,
      };
    },
    { ttl: 30 * 86400, swr: 90 * 86400 } // venues don't move — cache 30d fresh, 90d stale
  );
}
