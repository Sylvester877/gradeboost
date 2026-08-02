import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sources, sourceChunks, quizzes, type QuizQuestion } from "@/db/schema";
import { eq } from "drizzle-orm";
import { completeJSON, hasApiKey } from "@/lib/openrouter";
import { quizPrompt } from "@/lib/prompts";
import { demoQuiz } from "@/lib/demo";
import { retrieve, rankChunks, type TextbookChunk } from "@/lib/textbook-search";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const { topic, sourceId, count = 6, difficulty = "mixed", subject } = await req.json();

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

  let data: { title?: string; questions?: QuizQuestion[] };
  if (!hasApiKey()) {
    data = demoQuiz(String(topic || ""), Number(count));
  } else {
    try {
      data = await completeJSON<{ title?: string; questions?: QuizQuestion[] }>(
        quizPrompt(String(topic || ""), sourceContent, Number(count), String(difficulty), subject),
        { temperature: 0.7 }
      );
    } catch {
      // graceful fallback so generation never hard-fails
      data = demoQuiz(String(topic || ""), Number(count));
    }
  }

  const questions = (data.questions || []).filter(
    (x) => x && typeof x.question === "string" && Array.isArray(x.options) && x.options.length >= 2
  );
  if (questions.length === 0) {
    return NextResponse.json({ error: "No valid questions generated." }, { status: 502 });
  }

  const [created] = await db
    .insert(quizzes)
    .values({
      sourceId: resolvedId,
      title: data.title || `Quiz: ${topic || "Maths"}`,
      topic: String(topic || "").trim() || null,
      difficulty: String(difficulty),
      questions,
    })
    .returning();

  return NextResponse.json(created);
}

// keep tree-shaking happy
void sources;
