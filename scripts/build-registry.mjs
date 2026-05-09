/**
 * Build a large celebrity registry from Wikidata SPARQL.
 *
 * Strategy: per OCCUPATION (one at a time, simple query) fetch top-N humans
 * by sitelinks count (a strong free proxy for global recognition). Pause
 * between queries so the public endpoint doesn't 502 on us.
 *
 * Run with:  node scripts/build-registry.mjs
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SPARQL = "https://query.wikidata.org/sparql";
const ROOT = dirname(fileURLToPath(import.meta.url)) + "/..";
const OUT = `${ROOT}/data/celebrities.json`;
const UA = "stellar-registry-builder/0.1 (https://stellar.local) contact@stellar.local";

/**
 * One occupation per row. category, qid, threshold, limit.
 * Threshold = min sitelinks (popularity floor). Higher = fewer, more famous.
 */
const OCCUPATIONS = [
  // music
  { category: "music", occ: "Q177220", label: "singer", min: 50, limit: 120 },
  { category: "music", occ: "Q639669", label: "musician", min: 50, limit: 120 },
  { category: "music", occ: "Q2252262", label: "rapper", min: 30, limit: 80 },
  { category: "music", occ: "Q488205", label: "singer-songwriter", min: 40, limit: 80 },
  { category: "music", occ: "Q855091", label: "guitarist", min: 50, limit: 80 },
  { category: "music", occ: "Q183945", label: "record producer", min: 40, limit: 60 },
  // film & tv
  { category: "film", occ: "Q33999", label: "actor", min: 80, limit: 150 },
  { category: "film", occ: "Q10800557", label: "film actor", min: 60, limit: 150 },
  { category: "film", occ: "Q10798782", label: "tv actor", min: 50, limit: 100 },
  { category: "film", occ: "Q2526255", label: "film director", min: 60, limit: 100 },
  { category: "film", occ: "Q3282637", label: "film producer", min: 50, limit: 60 },
  { category: "film", occ: "Q28389", label: "screenwriter", min: 50, limit: 60 },
  // sports
  { category: "sports", occ: "Q937857", label: "footballer", min: 60, limit: 200 },
  { category: "sports", occ: "Q3665646", label: "basketball player", min: 40, limit: 120 },
  { category: "sports", occ: "Q10833314", label: "tennis player", min: 50, limit: 80 },
  { category: "sports", occ: "Q11774891", label: "ice hockey player", min: 30, limit: 80 },
  { category: "sports", occ: "Q19204627", label: "american football player", min: 30, limit: 80 },
  { category: "sports", occ: "Q11338576", label: "boxer", min: 50, limit: 60 },
  { category: "sports", occ: "Q13474373", label: "racing driver", min: 50, limit: 60 },
  // business
  { category: "business", occ: "Q43845", label: "businessperson", min: 50, limit: 80 },
  { category: "business", occ: "Q131524", label: "entrepreneur", min: 60, limit: 50 },
  // fashion
  { category: "fashion", occ: "Q4610556", label: "model", min: 40, limit: 80 },
  { category: "fashion", occ: "Q3501317", label: "fashion designer", min: 30, limit: 50 },
];

async function sparql(query) {
  const res = await fetch(SPARQL, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/sparql-query",
      "User-Agent": UA,
    },
    body: query,
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`HTTP ${res.status}: ${txt.slice(0, 120).replace(/\n/g, " ")}`);
  }
  return res.json();
}

async function fetchOccupation({ category, occ, label, min, limit }) {
  const query = `SELECT ?p ?pLabel ?article ?sl WHERE {
    ?p wdt:P106 wd:${occ} ;
       wdt:P31 wd:Q5 ;
       wikibase:sitelinks ?sl .
    FILTER(?sl >= ${min})
    ?article schema:about ?p ;
             schema:isPartOf <https://en.wikipedia.org/> .
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
  } ORDER BY DESC(?sl) LIMIT ${limit}`;

  const t0 = Date.now();
  const data = await sparql(query);
  const ms = Date.now() - t0;
  const rows = data?.results?.bindings ?? [];
  console.log(`  ${category}/${label.padEnd(24)} ${rows.length.toString().padStart(3)} (${ms}ms)`);

  return rows.map((r) => {
    const qid = r.p.value.replace(/^.*\/(Q\d+)$/, "$1");
    const article = r.article.value;
    const wiki = decodeURIComponent(article.split("/wiki/")[1]);
    const name = r.pLabel?.value ?? wiki.replace(/_/g, " ");
    const sitelinks = parseInt(r.sl.value, 10);
    return { qid, name, wiki, sitelinks, category };
  });
}

function initials(name) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function main() {
  if (!existsSync(`${ROOT}/data`)) mkdirSync(`${ROOT}/data`, { recursive: true });
  const all = [];
  const seen = new Set();
  let succeeded = 0, failed = 0;

  for (const occ of OCCUPATIONS) {
    let attempt = 0;
    let ok = false;
    while (attempt < 4) {
      try {
        const rows = await fetchOccupation(occ);
        for (const r of rows) {
          if (seen.has(r.qid)) continue;
          seen.add(r.qid);
          all.push(r);
        }
        succeeded++;
        ok = true;
        break;
      } catch (err) {
        attempt++;
        const wait = 4000 + attempt * 4000;
        console.warn(`    ↳ attempt ${attempt} failed: ${err.message}. Waiting ${wait}ms…`);
        await new Promise((r) => setTimeout(r, wait));
      }
    }
    if (!ok) failed++;
    // be polite — pause between queries
    await new Promise((r) => setTimeout(r, 2200));
  }

  all.sort((a, b) => b.sitelinks - a.sitelinks);

  const registry = all.map((r) => ({
    id: r.qid.toLowerCase(),
    qid: r.qid,
    name: r.name,
    wiki: r.wiki,
    category: r.category,
    initials: initials(r.name),
    rank: r.sitelinks,
    searchQuery: r.name,
  }));

  writeFileSync(OUT, JSON.stringify(registry, null, 2));
  console.log(`\nQueries: ${succeeded} succeeded, ${failed} failed`);
  console.log(`Wrote ${registry.length} celebrities to ${OUT}`);
  console.log(`\nTop 15 by global recognition (sitelinks):`);
  registry.slice(0, 15).forEach((c) =>
    console.log(`  ${c.rank.toString().padStart(3)} · ${c.category.padEnd(10)} · ${c.name}`)
  );
}

main().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
