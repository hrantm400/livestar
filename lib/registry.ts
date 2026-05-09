import { Category } from "./types";
import autoRegistry from "../data/celebrities.json";

export interface RegistryEntry {
  id: string;
  name: string;
  handle?: string;
  category: Category;
  initials: string;
  followers?: string;
  /** Wikipedia article title (URL-safe). */
  wiki: string;
  /** Wikidata QID for SPARQL lookups. */
  qid: string;
  /** Sports player name on TheSportsDB (only for athletes). */
  sportsdb?: string;
  /** iTunes search term for music artists. */
  itunes?: string;
  /** GDELT/Reddit search query — usually quoted full name. */
  searchQuery: string;
  /** Sitelinks count — used for default ordering. */
  rank: number;
}

interface AutoEntry {
  id: string;
  qid: string;
  name: string;
  wiki: string;
  category: string;
  initials: string;
  rank: number;
  searchQuery: string;
}

/**
 * Hand-curated overlays — for the most famous tracked stars we add
 * follower counts, social handles, and service-specific lookup keys.
 * Keyed by Wikidata QID so they merge cleanly with the auto registry.
 */
const CURATED: Record<string, Partial<RegistryEntry> & { qid: string }> = {
  Q26876: { qid: "Q26876", handle: "@taylorswift", followers: "283M", itunes: "Taylor Swift" },
  Q615: { qid: "Q615", handle: "@leomessi", followers: "503M", sportsdb: "Lionel Messi" },
  Q221955: { qid: "Q221955", handle: "@zendaya", followers: "184M" },
  Q2003599: { qid: "Q2003599", handle: "@theweeknd", followers: "76M", itunes: "The Weeknd" },
  Q36153: { qid: "Q36153", handle: "@beyonce", followers: "317M", itunes: "Beyoncé" },
  Q11571: { qid: "Q11571", handle: "@cristiano", followers: "631M", sportsdb: "Cristiano Ronaldo" },
  Q22686315: { qid: "Q22686315", handle: "@tchalamet", followers: "24M" },
  Q36844: { qid: "Q36844", handle: "@badgalriri", followers: "152M", itunes: "Rihanna" },
  Q15935: { qid: "Q15935", handle: "@champagnepapi", followers: "143M", itunes: "Drake" },
  Q36159: { qid: "Q36159", handle: "@kingjames", followers: "160M", sportsdb: "LeBron James" },
  Q210701: { qid: "Q210701", handle: "@arianagrande", followers: "378M", itunes: "Ariana Grande" },
  Q317521: { qid: "Q317521", handle: "@elonmusk", followers: "208M" },
};

function deriveItunes(category: string, name: string): string | undefined {
  return category === "music" ? name : undefined;
}

function buildRegistry(): RegistryEntry[] {
  const auto = autoRegistry as AutoEntry[];
  return auto
    .map((a): RegistryEntry => {
      // Strip qid from overlay since the auto entry is the source of truth for it.
      const overlay = CURATED[a.qid];
      const { qid: _, ...overlayRest } = overlay ?? {};
      void _;
      return {
        id: a.id,
        qid: a.qid,
        name: a.name,
        wiki: a.wiki,
        category: a.category as Category,
        initials: a.initials,
        rank: a.rank,
        searchQuery: a.searchQuery,
        // Auto-derive iTunes for all music artists; override via curated below.
        itunes: deriveItunes(a.category, a.name),
        ...overlayRest,
      };
    })
    .sort((a, b) => b.rank - a.rank);
}

let _registry: RegistryEntry[] | null = null;

export function getRegistry(): RegistryEntry[] {
  if (!_registry) _registry = buildRegistry();
  return _registry;
}

export function getRegistryEntry(id: string): RegistryEntry | undefined {
  return getRegistry().find((c) => c.id === id || c.qid === id || c.qid.toLowerCase() === id);
}

/**
 * Backwards-compat export. Eagerly materializes the registry on first read.
 * (We avoided a Proxy here because Array.prototype.map relies on HasProperty,
 * which would have to be re-implemented as a `has` trap to forward correctly.)
 */
export const REGISTRY: RegistryEntry[] = getRegistry();
