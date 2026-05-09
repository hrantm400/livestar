import { NextRequest, NextResponse } from "next/server";
import { buildFeed } from "@/lib/aggregator";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(req: NextRequest) {
  const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? "24"), 60);
  try {
    const events = await buildFeed(limit);
    return NextResponse.json({ events }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("[/api/feed] failed", err);
    return NextResponse.json({ events: [] }, { status: 500 });
  }
}
