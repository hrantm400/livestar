import { NextResponse } from "next/server";
import { buildList } from "@/lib/aggregator";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET() {
  try {
    const list = await buildList();
    return NextResponse.json({ celebrities: list }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error("[/api/celebrities] failed", err);
    return NextResponse.json({ celebrities: [] }, { status: 500 });
  }
}
