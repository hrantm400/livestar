import { cached } from "../cache";
import { fetchJson } from "./_fetch";

export interface WikiSearchResult {
  title: string;
  description: string;
  thumbnail?: string;
  pageId: number;
}

interface RawSearchResponse {
  pages?: Array<{
    id: number;
    key: string;
    title: string;
    excerpt?: string;
    description?: string;
    thumbnail?: { url: string; width: number; height: number };
  }>;
}

/**
 * Wikipedia full-text search REST API. Free, no key.
 * Returns up to 10 candidate pages.
 */
export async function searchWikipedia(query: string, limit = 10): Promise<WikiSearchResult[]> {
  if (!query?.trim()) return [];
  return cached(
    `wikisearch:${query.toLowerCase()}:${limit}`,
    async () => {
      const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(
        query
      )}&limit=${limit}`;
      const data = await fetchJson<RawSearchResponse>(url, { timeoutMs: 6000 });
      const pages = data?.pages ?? [];
      return pages.map((p) => ({
        title: p.title,
        description: p.description ?? "",
        thumbnail: p.thumbnail?.url
          ? p.thumbnail.url.startsWith("//")
            ? `https:${p.thumbnail.url}`
            : p.thumbnail.url
          : undefined,
        pageId: p.id,
      }));
    },
    { ttl: 600, swr: 1800 }
  );
}
