import { cached } from "../cache";
import { fetchJson } from "./_fetch";

export interface WikidataFacts {
  qid: string;
  twitter?: string;
  instagram?: string;
  tiktok?: string;
  officialWebsite?: string;
  birthplace?: { name: string; lat: number; lng: number };
}

interface SparqlBinding {
  [k: string]: { value: string; type: string };
}

interface SparqlResponse {
  results?: { bindings?: SparqlBinding[] };
}

const SPARQL_URL = "https://query.wikidata.org/sparql";

async function sparql<T = SparqlResponse>(query: string): Promise<T | null> {
  const url = `${SPARQL_URL}?format=json&query=${encodeURIComponent(query)}`;
  return fetchJson<T>(url, {
    headers: { Accept: "application/sparql-results+json" },
    timeoutMs: 10_000,
    retries: 0,
  });
}

/**
 * Two simple SPARQL queries (no SERVICE wikibase:label, which is slow):
 *  1. identifiers + birthplace QID + coords
 *  2. (separate) birthplace label by entity URL → fall back to wikipedia title.
 *
 * Splitting keeps each query well under the 10s timeout.
 */
export async function wikidataFacts(qid: string): Promise<WikidataFacts | null> {
  if (!qid?.startsWith("Q")) return null;
  return cached(
    `wikidata:${qid}`,
    async () => {
      const q1 = `
        SELECT ?twitter ?instagram ?tiktok ?website ?birthplace ?coord WHERE {
          OPTIONAL { wd:${qid} wdt:P2002 ?twitter. }
          OPTIONAL { wd:${qid} wdt:P2003 ?instagram. }
          OPTIONAL { wd:${qid} wdt:P7085 ?tiktok. }
          OPTIONAL { wd:${qid} wdt:P856 ?website. }
          OPTIONAL {
            wd:${qid} wdt:P19 ?birthplace.
            ?birthplace wdt:P625 ?coord.
          }
        } LIMIT 1`;
      const data = await sparql(q1);
      const b = data?.results?.bindings?.[0];
      if (!b) return { qid };
      const facts: WikidataFacts = { qid };
      if (b.twitter?.value) facts.twitter = b.twitter.value;
      if (b.instagram?.value) facts.instagram = b.instagram.value;
      if (b.tiktok?.value) facts.tiktok = b.tiktok.value;
      if (b.website?.value) facts.officialWebsite = b.website.value;
      if (b.coord?.value && b.birthplace?.value) {
        const m = b.coord.value.match(/Point\(([-\d.]+) ([-\d.]+)\)/);
        if (m) {
          // Try to fetch a label, but don't block on it.
          const bpQid = b.birthplace.value.replace(/^.*\/(Q\d+)$/, "$1");
          const label = await getLabel(bpQid).catch(() => null);
          facts.birthplace = {
            name: label ?? bpQid,
            lng: parseFloat(m[1]),
            lat: parseFloat(m[2]),
          };
        }
      }
      return facts;
    },
    { ttl: 7 * 86400, swr: 30 * 86400 }
  );
}

async function getLabel(qid: string): Promise<string | null> {
  if (!qid?.startsWith("Q")) return null;
  return cached(
    `wikidata:label:${qid}`,
    async () => {
      const q = `SELECT ?label WHERE { wd:${qid} rdfs:label ?label. FILTER(LANG(?label)="en") } LIMIT 1`;
      const data = await sparql(q);
      return data?.results?.bindings?.[0]?.label?.value ?? null;
    },
    { ttl: 30 * 86400, swr: 90 * 86400 }
  );
}
