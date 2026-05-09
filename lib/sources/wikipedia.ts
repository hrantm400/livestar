import { cached } from "../cache";
import { fetchJson } from "./_fetch";

export interface WikiSummary {
  title: string;
  description?: string;
  extract: string;
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
  coordinates?: { lat: number; lon: number };
  pageUrl: string;
  wikidataId?: string;
}

interface RawSummary {
  title: string;
  description?: string;
  extract: string;
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string; width: number; height: number };
  coordinates?: { lat: number; lon: number };
  content_urls?: { desktop?: { page: string } };
  wikibase_item?: string;
}

export async function getWikiSummary(title: string): Promise<WikiSummary | null> {
  return cached(`wiki:${title}`, async () => {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title
    )}?redirect=true`;
    const raw = await fetchJson<RawSummary>(url);
    if (!raw || !raw.extract) return null;
    return {
      title: raw.title,
      description: raw.description,
      extract: raw.extract,
      thumbnail: raw.thumbnail,
      originalimage: raw.originalimage,
      coordinates: raw.coordinates,
      pageUrl: raw.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
      wikidataId: raw.wikibase_item,
    };
  }, { ttl: 6 * 3600, swr: 24 * 3600 }); // 6h fresh, 24h stale
}
