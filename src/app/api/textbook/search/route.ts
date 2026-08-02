import { NextRequest, NextResponse } from "next/server";
import { retrieve } from "@/lib/textbook-search";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const subject = searchParams.get("subject")?.trim();
  if (!q) return NextResponse.json({ chunks: [] });
  const chunks = await retrieve(q, subject || undefined, 10);
  return NextResponse.json({ chunks });
}

export async function POST(req: NextRequest) {
  const { query, subject } = (await req.json().catch(() => ({}))) as {
    query?: string;
    subject?: string;
  };
  if (!query?.trim()) return NextResponse.json({ chunks: [] });
  const chunks = await retrieve(query.trim(), subject?.trim() || undefined, 10);
  return NextResponse.json({ chunks });
}
