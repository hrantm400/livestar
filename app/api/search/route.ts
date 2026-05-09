import { NextRequest, NextResponse } from "next/server";
import { searchWikipedia } from "@/lib/sources/wikipedia-search";
import { getRegistry } from "@/lib/registry";

export const dynamic = "force-dynamic";
export const revalidate = 60;

/**
 * Federated search:
 *  1. Local registry (instant, hundreds of indexed celebs).
 *  2. Wikipedia REST search (any human in the encyclopedia).
 * Local hits are ranked first.
 */
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ local: [], external: [] });

  const reg = getRegistry();
  const term = q.toLowerCase();
  const local = reg
    .filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.qid.toLowerCase() === term ||
        c.id.toLowerCase() === term
    )
    .slice(0, 8)
    .map((c) => ({
      id: c.id,
      qid: c.qid,
      name: c.name,
      category: c.category,
      initials: c.initials,
      followers: c.followers ?? null,
      indexed: true,
    }));

  // Skip external if we already have plenty of local hits
  let external: Awaited<ReturnType<typeof searchWikipedia>> = [];
  if (local.length < 5) {
    external = await searchWikipedia(q, 8 - local.length).catch(() => []);
  }

  return NextResponse.json(
    { local, external },
    { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } }
  );
}
