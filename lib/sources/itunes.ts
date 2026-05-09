import { cached } from "../cache";
import { fetchJson } from "./_fetch";

export interface ItunesArtist {
  artistId: number;
  artistName: string;
  artistLinkUrl: string;
  primaryGenreName?: string;
}

export interface ItunesRelease {
  collectionId: number;
  collectionName: string;
  releaseDate: string;
  artworkUrl100: string;
  trackCount: number;
  collectionViewUrl: string;
}

interface RawArtistResponse {
  results?: Array<Record<string, unknown>>;
}

export async function findItunesArtist(name: string): Promise<ItunesArtist | null> {
  return cached(
    `itunes:artist:${name}`,
    async () => {
      const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
        name
      )}&entity=musicArtist&limit=1`;
      const data = await fetchJson<RawArtistResponse>(url);
      const r = data?.results?.[0];
      if (!r) return null;
      return {
        artistId: r.artistId as number,
        artistName: r.artistName as string,
        artistLinkUrl: r.artistLinkUrl as string,
        primaryGenreName: r.primaryGenreName as string,
      };
    },
    { ttl: 24 * 3600, swr: 7 * 86400 }
  );
}

export async function recentReleases(artistId: number): Promise<ItunesRelease[]> {
  return cached(
    `itunes:releases:${artistId}`,
    async () => {
      const url = `https://itunes.apple.com/lookup?id=${artistId}&entity=album&limit=8&sort=recent`;
      const data = await fetchJson<RawArtistResponse>(url);
      const results = (data?.results ?? []).filter(
        (r) => (r as { wrapperType?: string }).wrapperType === "collection"
      );
      return results
        .map((r): ItunesRelease => ({
          collectionId: r.collectionId as number,
          collectionName: r.collectionName as string,
          releaseDate: r.releaseDate as string,
          artworkUrl100: r.artworkUrl100 as string,
          trackCount: r.trackCount as number,
          collectionViewUrl: r.collectionViewUrl as string,
        }))
        .filter((r) => r.releaseDate)
        .sort((a, b) => +new Date(b.releaseDate) - +new Date(a.releaseDate));
    },
    { ttl: 6 * 3600, swr: 24 * 3600 }
  );
}
