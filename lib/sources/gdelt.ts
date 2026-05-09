import { cached } from "../cache";
import { fetchJson, rateLimit } from "./_fetch";

export interface GdeltArticle {
  url: string;
  title: string;
  domain: string;
  language: string;
  seenAt: string; // ISO
  socialImage?: string;
}

interface RawGdeltResponse {
  articles?: Array<{
    url: string;
    title: string;
    domain: string;
    language: string;
    seendate: string; // YYYYMMDDTHHmmssZ
    socialimage?: string;
  }>;
}

function parseGdeltDate(s: string): string {
  // 20260505T194500Z -> 2026-05-05T19:45:00Z
  const m = s.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return new Date().toISOString();
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
}

export async function gdeltArticles(
  query: string,
  opts: { max?: number; timespan?: string } = {}
): Promise<GdeltArticle[]> {
  const max = opts.max ?? 10;
  const timespan = opts.timespan ?? "7d";
  const key = `gdelt:${query}:${max}:${timespan}`;
  return cached(
    key,
    async () => {
      // GDELT enforces 1 req per 5 seconds — be a good neighbor.
      await rateLimit("api.gdeltproject.org", 5_500);
      const q = query.includes(" ") ? `"${query}"` : query;
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(
        q
      )}&format=json&mode=ArtList&maxrecords=${max}&sort=DateDesc&timespan=${timespan}`;
      const data = await fetchJson<RawGdeltResponse>(url, { timeoutMs: 15_000, retries: 0 });
      if (!data?.articles) return [];
      return data.articles.map((a) => ({
        url: a.url,
        title: a.title,
        domain: a.domain,
        language: a.language,
        seenAt: parseGdeltDate(a.seendate),
        socialImage: a.socialimage,
      }));
    },
    { ttl: 600, swr: 1800 } // 10min fresh, 30min stale — GDELT is rate-limited so cache hard
  );
}

/**
 * GDELT TimelineVol — get a 7-day mention volume curve as a "trending" signal.
 */
export async function gdeltVolume(query: string): Promise<number[]> {
  const key = `gdelt:vol:${query}`;
  return cached(
    key,
    async () => {
      await rateLimit("api.gdeltproject.org", 5_500);
      const q = query.includes(" ") ? `"${query}"` : query;
      const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(
        q
      )}&format=json&mode=TimelineVol&timespan=7d`;
      const data = await fetchJson<{ timeline?: Array<{ data?: Array<{ value: number }> }> }>(url, {
        timeoutMs: 15_000,
        retries: 0,
      });
      const series = data?.timeline?.[0]?.data ?? [];
      return series.map((s) => s.value ?? 0);
    },
    { ttl: 1800, swr: 3600 }
  );
}
