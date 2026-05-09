import { NextRequest, NextResponse } from "next/server";
import { buildProfile } from "@/lib/aggregator";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const profile = await buildProfile(id);
    if (!profile) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(profile, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (err) {
    console.error(`[/api/celebrity/${id}] failed`, err);
    return NextResponse.json({ error: "Internal" }, { status: 500 });
  }
}
