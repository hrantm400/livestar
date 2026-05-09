import { ActivityEvent, Celebrity, Source } from "./types";
import { REGISTRY, RegistryEntry } from "./registry";
import { getWikiSummary } from "./sources/wikipedia";
import { wikidataFacts } from "./sources/wikidata";
import { gdeltArticles, gdeltVolume } from "./sources/gdelt";
import { redditMentions } from "./sources/reddit";
import { playerSchedule } from "./sources/sportsdb";
import { findItunesArtist, recentReleases } from "./sources/itunes";
import { geocode } from "./sources/nominatim";
import { pageviews, formatViews, type Pageviews } from "./sources/pageviews";
import { cached, peek } from "./cache";

export interface CelebrityProfile extends Celebrity {
  imageUrl?: string;
  wikiUrl?: string;
  twitter?: string;
  instagram?: string;
  tiktok?: string;
  officialWebsite?: string;
  trendVolume?: number[];
  redditScore?: number;
  newsArticles: NewsArticle[];
  releases: Release[];
  birthplace?: { name: string; lat: number; lng: number };
  liveSources: SourceStatus[];
  /** 30-day Wikipedia pageview totals + daily series (real popularity). */
  pageviews?: Pageviews;
  /** Compact human label for the popularity number, e.g. "528K". */
  pageviewsLabel?: string;
}

export interface NewsArticle {
  title: string;
  url: string;
  domain: string;
  seenAt: string;
  socialImage?: string;
}

export interface Release {
  title: string;
  releaseDate: string;
  artworkUrl: string;
  url: string;
  trackCount: number;
}

export interface SourceStatus {
  name: string;
  ok: boolean;
  count?: number;
}

function classifyEvent(dateISO: string): "past" | "now" | "soon" {
  const t = +new Date(dateISO);
  const now = Date.now();
  const diff = t - now;
  if (Math.abs(diff) < 6 * 3600 * 1000) return "now";
  if (diff > 0) return "soon";
  return "past";
}

function whenLabel(dateISO: string): string {
  const t = +new Date(dateISO);
  const diff = t - Date.now();
  const abs = Math.abs(diff);
  const min = abs / 60_000;
  const hr = min / 60;
  const day = hr / 24;
  if (diff < 0) {
    if (min < 60) return `${Math.round(min)} min ago`;
    if (hr < 24) return `${Math.round(hr)}h ago`;
    if (day < 14) return `${Math.round(day)} days ago`;
    return `${Math.round(day / 7)}w ago`;
  } else {
    if (min < 60) return `in ${Math.round(min)} min`;
    if (hr < 30) return "tomorrow";
    if (day < 14) return `in ${Math.round(day)} days`;
    return `in ${Math.round(day / 7)}w`;
  }
}

/**
 * Sport events: geocode venues to put pins on the map.
 */
async function sportsEvents(reg: RegistryEntry): Promise<ActivityEvent[]> {
  if (!reg.sportsdb) return [];
  try {
    const { upcoming, recent } = await playerSchedule(reg.sportsdb);
    const all = [...upcoming.slice(0, 3), ...recent.slice(0, 2)];
    const results: ActivityEvent[] = [];
    for (const e of all) {
      const venueQuery = [e.venue, e.city, e.country].filter(Boolean).join(", ");
      const geo = venueQuery ? await geocode(venueQuery) : null;
      if (!geo) continue;
      const type = classifyEvent(e.date);
      // Fall back to country/venue when city is empty (TheSportsDB inconsistency)
      const cityFallback = e.city?.trim() || e.country?.trim() || e.venue?.split(",")[0] || "—";
      results.push({
        id: e.id,
        type,
        title: e.title,
        place: e.venue || e.city || "Stadium",
        city: cityFallback,
        country: e.country?.trim() || "—",
        lat: geo.lat,
        lng: geo.lng,
        when: whenLabel(e.date),
        at: e.date,
        source: "Public schedule" satisfies Source,
        detail: e.league ? `${e.league}${e.past ? "" : " · upcoming"}` : undefined,
      });
    }
    return results;
  } catch (err) {
    console.warn(`[aggregator] sports failed for ${reg.id}`, err);
    return [];
  }
}

/**
 * News events: try to geocode each article's title for a map-able point.
 * If geocoding fails, surface as news article (non-pin) only.
 */
async function newsEvents(
  reg: RegistryEntry
): Promise<{ events: ActivityEvent[]; articles: NewsArticle[] }> {
  try {
    const articles = await gdeltArticles(reg.searchQuery, { max: 10, timespan: "7d" });
    const events: ActivityEvent[] = [];
    const newsArticles: NewsArticle[] = articles.map((a) => ({
      title: a.title,
      url: a.url,
      domain: a.domain,
      seenAt: a.seenAt,
      socialImage: a.socialImage,
    }));

    // Top 2 articles only — geocoding budget is precious (Nominatim 1 req/s).
    for (const a of articles.slice(0, 2)) {
      const place = extractPlace(a.title);
      if (!place) continue;
      const geo = await geocode(place);
      if (!geo) continue;
      const type = classifyEvent(a.seenAt);
      events.push({
        id: `news-${reg.id}-${Buffer.from(a.url).toString("base64").slice(0, 12)}`,
        type,
        title: a.title.slice(0, 120),
        place: geo.display.split(",")[0],
        city: geo.display.split(",")[0],
        country: geo.display.split(",").pop()?.trim() ?? "—",
        lat: geo.lat,
        lng: geo.lng,
        when: whenLabel(a.seenAt),
        at: a.seenAt,
        source: "Verified press" satisfies Source,
        detail: `${a.domain} · ${a.title}`,
      });
    }

    return { events, articles: newsArticles };
  } catch (err) {
    console.warn(`[aggregator] news failed for ${reg.id}`, err);
    return { events: [], articles: [] };
  }
}

const PLACE_PATTERNS = [
  /\b(?:in|at|from|to|near|outside|near)\s+([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+){0,2})/,
  /\b([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)?)\s+(?:concert|show|premiere|event|game|match)/i,
];

const COMMON_NON_PLACES = new Set([
  "Taylor", "Swift", "Drake", "Beyonce", "Beyoncé", "Rihanna", "Ariana",
  "Grande", "LeBron", "James", "Cristiano", "Ronaldo", "Lionel", "Messi",
  "Zendaya", "Elon", "Musk", "The", "And", "But", "For", "With", "From",
  "After", "Before", "During", "Star", "Stars", "Singer", "Actor", "Actress",
  "Tour", "Album", "Song", "Movie", "Film", "Show", "Photo", "Photos",
  "News", "Latest", "Today", "Tonight",
]);

function extractPlace(title: string): string | null {
  for (const re of PLACE_PATTERNS) {
    const m = title.match(re);
    if (m && m[1] && !COMMON_NON_PLACES.has(m[1].split(/\s+/)[0])) {
      return m[1];
    }
  }
  return null;
}

/**
 * Build a full celebrity profile by fanning out to every available source.
 */
export async function buildProfile(id: string): Promise<CelebrityProfile | null> {
  const reg = REGISTRY.find((r) => r.id === id);
  if (!reg) return null;

  return cached(
    `profile:${id}`,
    async () => {
      const sourcesStatus: SourceStatus[] = [];

      const wikiP = getWikiSummary(reg.wiki).catch(() => null);
      const factsP = reg.qid ? wikidataFacts(reg.qid).catch(() => null) : Promise.resolve(null);
      const sportsP = sportsEvents(reg);
      const newsP = newsEvents(reg);
      const trendP = gdeltVolume(reg.searchQuery).catch(() => [] as number[]);
      const redditP = redditMentions(reg.searchQuery, { limit: 5 }).catch(() => []);
      const itunesP = reg.itunes
        ? findItunesArtist(reg.itunes).then((a) => (a ? recentReleases(a.artistId) : [])).catch(() => [])
        : Promise.resolve([]);
      const pvP = pageviews(reg.wiki).catch(() => null);

      const [wiki, facts, sportsEv, news, trend, reddit, releases, pv] = await Promise.all([
        wikiP, factsP, sportsP, newsP, trendP, redditP, itunesP, pvP,
      ]);

      sourcesStatus.push({ name: "Wikipedia", ok: !!wiki });
      sourcesStatus.push({ name: "Wikidata", ok: !!facts });
      sourcesStatus.push({ name: "Pageviews", ok: !!pv, count: pv?.total });
      sourcesStatus.push({ name: "TheSportsDB", ok: sportsEv.length > 0, count: sportsEv.length });
      sourcesStatus.push({ name: "GDELT", ok: news.articles.length > 0, count: news.articles.length });
      sourcesStatus.push({ name: "Reddit", ok: reddit.length > 0, count: reddit.length });
      sourcesStatus.push({ name: "iTunes", ok: releases.length > 0, count: releases.length });
      sourcesStatus.push({ name: "Nominatim", ok: sportsEv.length > 0 || news.events.length > 0 });

      const events = [...sportsEv, ...news.events].sort((a, b) => +new Date(b.at) - +new Date(a.at));

      const redditScore = reddit.reduce((a, m) => a + m.score, 0);
      const isLive = sportsEv.some((e) => e.type === "now") ||
                     news.events.some((e) => e.type === "now");

      const bio =
        wiki?.extract ??
        `Public figure tracked across Wikipedia, GDELT news, Reddit, and ${reg.sportsdb ? "TheSportsDB" : "iTunes"}.`;

      // Derive a real social handle: prefer Wikidata Twitter, then Instagram,
      // then any hand-curated overlay. Falls back to a "@-less" empty string.
      const realHandle =
        (facts?.twitter && `@${facts.twitter}`) ??
        (facts?.instagram && `@${facts.instagram}`) ??
        reg.handle ??
        "";

      // Use real Wikipedia pageviews as the popularity number (replacing the
      // hardcoded "283M" follower counts that were only set for 12 curated celebs).
      const popularityLabel = pv ? formatViews(pv.total) : reg.followers ?? "—";

      const profile: CelebrityProfile = {
        id: reg.id,
        name: wiki?.title ?? reg.name,
        handle: realHandle,
        category: reg.category,
        initials: reg.initials,
        online: isLive,
        followers: popularityLabel,
        bio,
        events,
        imageUrl: wiki?.originalimage?.source ?? wiki?.thumbnail?.source,
        wikiUrl: wiki?.pageUrl,
        twitter: facts?.twitter,
        instagram: facts?.instagram,
        tiktok: facts?.tiktok,
        officialWebsite: facts?.officialWebsite,
        trendVolume: trend,
        redditScore,
        newsArticles: news.articles,
        releases: releases.map((r) => ({
          title: r.collectionName,
          releaseDate: r.releaseDate,
          artworkUrl: r.artworkUrl100.replace("100x100", "300x300"),
          url: r.collectionViewUrl,
          trackCount: r.trackCount,
        })),
        birthplace: facts?.birthplace,
        liveSources: sourcesStatus,
        pageviews: pv ?? undefined,
        pageviewsLabel: popularityLabel,
      };

      return profile;
    },
    { ttl: 120, swr: 600 } // profile cache: 2min fresh, 10min stale
  );
}

/**
 * Light list version — only registry headers, used for sidebar.
 * Stays cheap so the sidebar renders instantly even with 200+ celebrities.
 * Bio + image + "live" status enrich opportunistically from cached profiles.
 *
 * Cache TTL is short (15s) so the moment the user opens a profile and warms
 * the cache for that celebrity, the sidebar reflects new fields on next list fetch.
 */
export async function buildList(): Promise<Celebrity[]> {
  return cached(
    "list:all",
    async () => {
      return REGISTRY.map((reg): Celebrity => {
        const cachedProfile = peek<CelebrityProfile>(`profile:${reg.id}`);
        return {
          id: reg.id,
          name: cachedProfile?.name ?? reg.name,
          handle: cachedProfile?.handle ?? reg.handle ?? "",
          category: reg.category,
          initials: reg.initials,
          online: cachedProfile?.online ?? false,
          // Real Wikipedia pageviews label if we have a cached profile, else the
          // hand-curated overlay (only set for 12 stars), else empty.
          followers: cachedProfile?.pageviewsLabel ?? cachedProfile?.followers ?? reg.followers ?? "",
          bio: cachedProfile?.bio ?? "",
          events: [],
        };
      });
    },
    { ttl: 15, swr: 60 }
  );
}

/**
 * Combined live feed.
 * - Sports events for athletes (TheSportsDB + Nominatim) — always live.
 * - Already-cached profile events (news + everything from past `buildProfile` calls)
 *   bubble in opportunistically; we never trigger a fresh profile fetch from feed
 *   to keep latency bounded and respect GDELT's 5s rate limit.
 */
export async function buildFeed(
  limit = 24
): Promise<Array<ActivityEvent & { celebrityId: string; celebrityName: string }>> {
  return cached(
    `feed:${limit}`,
    async () => {
      const all = await Promise.all(
        REGISTRY.map(async (reg) => {
          const events: Array<ActivityEvent & { celebrityId: string; celebrityName: string }> = [];

          // 1. Always fetch sports (fast, all cached after first run).
          if (reg.sportsdb) {
            try {
              const sports = await sportsEvents(reg);
              for (const e of sports) {
                events.push({ ...e, celebrityId: reg.id, celebrityName: reg.name });
              }
            } catch {/* swallow */}
          }

          // 2. Opportunistically include events from already-cached profiles.
          const cachedProfile = peek<CelebrityProfile>(`profile:${reg.id}`);
          if (cachedProfile?.events) {
            const seen = new Set(events.map((e) => e.id));
            for (const e of cachedProfile.events) {
              if (seen.has(e.id)) continue;
              events.push({ ...e, celebrityId: reg.id, celebrityName: cachedProfile.name });
            }
          }

          return events;
        })
      );
      return all
        .flat()
        .sort((a, b) => +new Date(b.at) - +new Date(a.at))
        .slice(0, limit);
    },
    { ttl: 60, swr: 300 }
  );
}
