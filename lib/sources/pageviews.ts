import { cached } from "../cache";
import { fetchJson } from "./_fetch";

export interface Pageviews {
  total: number;
  /** 30-day daily view counts, oldest → newest. */
  daily: number[];
  /** Average daily views over the window. */
  avg: number;
}

interface RawPageviews {
  items?: Array<{ timestamp: string; views: number }>;
}

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Format YYYYMMDDHH for the pageviews API. The API uses UTC midnight.
 */
function formatStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}00`;
}

/**
 * Wikipedia pageviews — a free, no-auth popularity metric.
 * 30-day daily view counts for an article. Used as a "buzz" indicator
 * and a real follower/popularity proxy that doesn't require Twitter API.
 */
export async function pageviews(article: string): Promise<Pageviews | null> {
  if (!article) return null;
  return cached(
    `pageviews:${article}`,
    async () => {
      const end = new Date();
      end.setUTCHours(0, 0, 0, 0);
      end.setUTCDate(end.getUTCDate() - 1); // pageviews has 1d lag
      const start = new Date(end);
      start.setUTCDate(end.getUTCDate() - 29);

      const url = `https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/en.wikipedia/all-access/all-agents/${encodeURIComponent(
        article
      )}/daily/${formatStamp(start)}/${formatStamp(end)}`;

      const data = await fetchJson<RawPageviews>(url, { timeoutMs: 8000 });
      if (!data?.items?.length) return null;

      const daily = data.items.map((i) => i.views);
      const total = daily.reduce((a, b) => a + b, 0);
      const avg = Math.round(total / daily.length);
      return { total, daily, avg };
    },
    { ttl: 6 * 3600, swr: 24 * 3600 }
  );
}

/**
 * Format a raw pageview number as a compact human label, e.g. 18484 → "18K"
 */
export function formatViews(n: number): string {
  if (n < 1000) return n.toString();
  if (n < 1_000_000) return `${(n / 1000).toFixed(n < 10_000 ? 1 : 0).replace(/\.0$/, "")}K`;
  return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0).replace(/\.0$/, "")}M`;
}
