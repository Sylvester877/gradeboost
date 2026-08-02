import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sources, studySessions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { complete } from "@/lib/openrouter";
import { summaryPrompt } from "@/lib/prompts";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { sourceId } = await req.json();
  if (!sourceId) return NextResponse.json({ error: "sourceId required" }, { status: 400 });

  const rows = await db.select().from(sources).where(eq(sources.id, Number(sourceId))).limit(1);
  const source = rows[0];
  if (!source) return NextResponse.json({ error: "Source not found" }, { status: 404 });

  try {
    const notes = await complete(summaryPrompt(source.content, source.topic || source.title), {
      temperature: 0.5,
      maxTokens: 2400,
    });
    await db.insert(studySessions).values({
      type: "chat",
      sourceId: source.id,
      minutes: 3,
      points: 4,
      detail: `Generated study notes for ${source.title}`,
    });
    return NextResponse.json({ notes });
  } catch {
    return NextResponse.json(
      { error: "Couldn't generate notes right now." },
      { status: 502 }
    );
  }
}
