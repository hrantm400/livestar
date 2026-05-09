import { NextResponse } from "next/server";
import { cacheStats } from "@/lib/cache";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    sources: [
      { name: "Wikipedia", url: "https://en.wikipedia.org/api/rest_v1", auth: "none" },
      { name: "Wikidata SPARQL", url: "https://query.wikidata.org/sparql", auth: "none" },
      { name: "GDELT 2.0", url: "https://api.gdeltproject.org/api/v2/doc/doc", auth: "none" },
      { name: "Reddit", url: "https://www.reddit.com/search.json", auth: "none" },
      { name: "TheSportsDB", url: "https://www.thesportsdb.com/api/v1/json/3", auth: "test-key" },
      { name: "iTunes Search", url: "https://itunes.apple.com/search", auth: "none" },
      { name: "Nominatim", url: "https://nominatim.openstreetmap.org/search", auth: "user-agent" },
    ],
    cache: cacheStats(),
    ts: new Date().toISOString(),
  });
}
