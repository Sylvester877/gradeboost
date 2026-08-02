import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sources, sourceChunks, flashcards } from "@/db/schema";
import { eq } from "drizzle-orm";
import { completeJSON, hasApiKey } from "@/lib/openrouter";
import { flashcardsPrompt } from "@/lib/prompts";
import { demoFlashcards } from "@/lib/demo";
import { retrieve, rankChunks, type TextbookChunk } from "@/lib/textbook-search";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { topic, sourceId, count = 8, subject } = await req.json();

  let sourceContent: string | null = null;
  let resolvedId: number | null = null;
  if (sourceId) {
    const rows = await db.select().from(sources).where(eq(sources.id, Number(sourceId))).limit(1);
    if (rows[0]) {
      resolvedId = rows[0].id;
      const topicStr = String(topic || "").trim();

      // Use semantic chunk selection when a topic is specified and embeddings exist.
      if (topicStr) {
        const stored = await db
          .select()
          .from(sourceChunks)
          .where(eq(sourceChunks.sourceId, resolvedId))
          .orderBy(sourceChunks.id);

        const chunked: TextbookChunk[] = stored.map((c) => ({
          id: c.id,
          text: c.text,
          embedding: c.embedding,
        }));

        const topChunks = await rankChunks(topicStr, chunked, 6);
        if (topChunks.length > 0) {
          sourceContent = topChunks.map((c) => c.text).join("\n\n");
        }
      }

      // Fall back to full content if no topic or no embeddings yet.
      if (!sourceContent) {
        sourceContent = rows[0].content;
      }
    }
  } else if (subject) {
    // Use subject-aware retrieval when no specific source is selected.
    const chunks = await retrieve(String(topic || ""), subject, 3);
    if (chunks.length) {
      sourceContent = chunks.map((c, i) => `[Excerpt ${i + 1}]\n${c.text}`).join("\n\n");
    }
  }

  let data: { cards?: { front: string; back: string }[] };
  if (!hasApiKey()) {
    data = demoFlashcards(String(topic || ""), Number(count));
  } else {
    try {
      data = await completeJSON<{ cards?: { front: string; back: string }[] }>(
        flashcardsPrompt(String(topic || ""), sourceContent, Number(count), subject),
        { temperature: 0.6 }
      );
    } catch {
      // graceful fallback
      data = demoFlashcards(String(topic || ""), Number(count));
    }
  }

  const cards = (data.cards || []).filter((c) => c && c.front && c.back);
  if (cards.length === 0) {
    return NextResponse.json({ error: "No flashcards generated." }, { status: 502 });
  }

  const rows = await db
    .insert(flashcards)
    .values(
      cards.map((c) => ({
        sourceId: resolvedId,
        front: c.front,
        back: c.back,
      }))
    )
    .returning();

  return NextResponse.json({ created: rows.length });
}
