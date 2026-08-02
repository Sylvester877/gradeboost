import { NextRequest } from "next/server";
import { db } from "@/db";
import { chatMessages, chatSessions, sources, sourceChunks, studySessions } from "@/db/schema";
import { streamChat, streamVision, type ChatMessage, type ContentPart } from "@/lib/openrouter";
import { closedBookSystem, VISION_TUTOR_SYSTEM } from "@/lib/prompts";
import {
  retrieve,
  chunkSource,
  rankChunksWithDiversity,
  MAX_SOURCE_CHUNKS_PER_SOURCE,
  type TextbookChunk,
} from "@/lib/textbook-search";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

// Total ranked chunks pulled from uploaded sources, spread across ALL sources
// for the subject (per-source diversity) so no source is starved out.
const TOP_K_SOURCE_CHUNKS = 10;
// Per-source cap when ranking so one huge source can't crowd out the others.
const MAX_CHUNKS_PER_SOURCE = 3;

const metaPhrases = [
  "this is",
  "the user said",
  "the user says",
  "the user typed",
  "the user wrote",
  "the user sent",
  "the user is",
  "the user asked",
  "the user asks",
  "the user wants",
  "the user message",
  "user said",
  "user asks",
  "user asked",
  "user wants",
  "the student said",
  "the student asked",
  "the student wants",
  "what should i respond",
  "what should i reply",
  "i should respond",
  "i should greet",
  "let me greet",
  "i should",
  "i need to",
  "i will",
  "i'll",
  "i am",
  "i'm",
  "let me",
  "i can see",
  "i have",
  "as an ai",
  "i am an ai",
  "i'm an ai",
  "as a language model",
  "i am a language model",
];

/** Strip any internal monologue / chain-of-thought prefix the model emits. */
function stripMetaPrefix(text: string): string {
  let result = text.trimStart();
  while (result) {
    const lower = result.toLowerCase();
    const phrase = metaPhrases.find((p) => lower.startsWith(p));
    if (!phrase) break;

    // Find the end of this meta sentence.
    const after = result.slice(phrase.length);
    const dot = after.indexOf(".");
    const excl = after.indexOf("!");
    const ques = after.indexOf("?");
    let end = Infinity;
    for (const idx of [dot, excl, ques]) {
      if (idx !== -1 && idx + 1 < end) {
        end = idx + 1;
      }
    }
    if (!isFinite(end)) break;

    result = result.slice(phrase.length + end).trimStart();
  }
  return result;
}

export async function POST(req: NextRequest) {
  // Protect against huge payloads (especially base64 images).
  const contentLength = Number(req.headers.get("content-length") || "0");
  if (contentLength > 10 * 1024 * 1024) {
    return new Response("Request body too large (max 10 MB).", { status: 413 });
  }

  const { question, history = [], sourceId, image, sessionId, subject } = await req.json();
  const q = String(question || "").trim();
  if (!q && !image) return new Response("Empty request", { status: 400 });

  // Reject overly large base64 images before they reach the vision model.
  if (image && typeof image === "string" && image.length > 2_000_000) {
    return new Response(
      JSON.stringify({ error: "Image too large. Please use a smaller photo (under ~1.5 MB after compression)." }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    );
  }

  // resolve uploaded source context using ranked RAG chunks.
  // When no specific source is picked, automatically pull ALL sources for the subject.
  let sourceContent: string | null = null;
  let resolvedId: number | null = null;
  // Titles of every available source for the subject (for the prompt + UI badges).
  let availableSourceTitles: string[] = [];
  // Titles that actually contributed ranked chunks to this answer (for UI badges).
  let usedSourceTitles: string[] = [];

  const effectiveSourceId = sourceId ?? (subject ? "all" : null);
  if (effectiveSourceId) {
    let targetSources = await (async () => {
      if (effectiveSourceId === "all") {
        const all = subject
          ? await db.select().from(sources).where(eq(sources.subject, subject))
          : await db.select().from(sources);
        return all;
      }
      const rows = await db.select().from(sources).where(eq(sources.id, Number(effectiveSourceId))).limit(1);
      return rows;
    })();

    // Exclude the global textbook; it is handled by the textbook.json index below.
    targetSources = targetSources.filter((s) => s.topic !== "Textbook");
    availableSourceTitles = targetSources.map((s) => s.title);

    if (targetSources.length > 0) {
      // Gather chunks from every source, tagged with the source title so we can
      // enforce per-source diversity in the final ranking.
      type TaggedChunk = TextbookChunk & { title: string };
      const allChunks: TaggedChunk[] = [];
      let id = 1;
      for (const s of targetSources) {
        const stored = await db
          .select()
          .from(sourceChunks)
          .where(eq(sourceChunks.sourceId, s.id))
          .orderBy(sourceChunks.id);
        const sourceChunksList =
          stored.length > 0
            ? stored.map((c) => ({ id: c.id, text: c.text, embedding: c.embedding }))
            : chunkSource(s.content).map((text, idx) => ({ id: idx, text, embedding: undefined as number[] | undefined }));
        for (const chunk of sourceChunksList.slice(0, MAX_SOURCE_CHUNKS_PER_SOURCE)) {
          allChunks.push({ id: id++, text: chunk.text, embedding: chunk.embedding, title: s.title });
        }
      }

      if (allChunks.length > 0) {
        const topChunks = await rankChunksWithDiversity(q, allChunks, TOP_K_SOURCE_CHUNKS, MAX_CHUNKS_PER_SOURCE);
        // Cap the total source context so the prompt stays lean and responses stay fast.
        sourceContent = topChunks
          .map((c) => `[${c.title}]\n${c.text}`)
          .join("\n\n")
          .slice(0, 8000);
        usedSourceTitles = [...new Set(topChunks.map((c) => c.title))];
      }
      resolvedId = effectiveSourceId === "all" ? null : Number(effectiveSourceId);
    }
  }

  // The bundled textbook index only exists for Mathematics. For other subjects the
  // uploaded sources above are the study material — scanning them again here would
  // duplicate context and waste tokens/time.
  let textbookContext = "";
  if (subject === "Mathematics") {
    const chunks = await retrieve(q, "Mathematics", 8);
    textbookContext = chunks.map((c, i) => `[Excerpt ${i + 1}]\n${c.text}`).join("\n\n");
  }

  // resolve or create the chat session
  let currentSessionId = sessionId ? Number(sessionId) : null;
  // A non-positive sessionId is a client-side placeholder for a brand-new chat.
  if (currentSessionId && currentSessionId > 0) {
    const session = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, currentSessionId))
      .limit(1);
    if (session[0] && !resolvedId) {
      resolvedId = session[0].sourceId ?? null;
    }
  } else {
    const [newSession] = await db
      .insert(chatSessions)
      .values({
        title: q ? q.slice(0, 40) : "Image solve",
        sourceId: resolvedId,
        subject: subject ? String(subject) : undefined,
      })
      .returning();
    currentSessionId = newSession.id;
  }

  // build the generator — vision path for photos, text path otherwise
  let gen: AsyncGenerator<string, void, unknown>;
  // Assemble reference material from textbook excerpts and ranked source chunks.
  const referenceContext =
    (textbookContext ? `TEXTBOOK EXCERPTS:\n${textbookContext.slice(0, 3000)}` : "") +
    (sourceContent ? `\n\nUPLOADED SOURCES:\n"""${sourceContent}"""` : "");

  if (image) {
    const parts: ContentPart[] = [];
    if (q) parts.push({ type: "text", text: q });
    parts.push({
      type: "text",
      text: "This is a problem from my textbook. Read it carefully and give a complete, step-by-step worked solution. Use LaTeX for the maths. Solve every part.",
    });
    parts.push({ type: "image_url", image_url: { url: image as string } });
    const messages: ChatMessage[] = [
      { role: "system", content: VISION_TUTOR_SYSTEM },
      ...(sourceContent
        ? ([{ role: "system" as const, content: `Reference material from the student's uploaded notes:\n"""${sourceContent}"""` }] as ChatMessage[])
        : []),
      { role: "user", content: parts },
    ];
    gen = streamVision(messages, { temperature: 0.4 });
  } else {
    const systemContent = `${closedBookSystem(subject ?? undefined, {
      hasUploadedSources: !!sourceContent,
      sourceTitles: availableSourceTitles,
    })}\n\n${referenceContext}`;
    const messages: ChatMessage[] = [
      { role: "system", content: systemContent },
      ...(history as ChatMessage[]).slice(-20),
      { role: "user", content: q },
    ];
    gen = streamChat(messages, { temperature: 0.3 });
  }

  // persist the user's question immediately
  await db.insert(chatMessages).values({
    sessionId: currentSessionId,
    sourceId: resolvedId,
    role: "user",
    content: image ? `${q}\n\n[📷 photo attached]` : q,
  });

  const encoder = new TextEncoder();
  let assistantText = "";
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let controllerClosed = false;
      const enqueue = (text: string) => {
        if (controllerClosed) return;
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          controllerClosed = true;
        }
      };

      try {
        let streamedAny = false;
        let prefixBuffer = "";
        for await (const delta of gen) {
          if (controllerClosed) break;
          assistantText += delta;

          // Buffer the very beginning of the stream so we can strip internal monologue.
          if (!streamedAny) {
            prefixBuffer += delta;
            const cleaned = stripMetaPrefix(prefixBuffer);

            // Stripping removed something but left text behind (possibly the start of
            // another meta phrase). Keep the remaining text in the buffer and continue
            // accumulating so we never cut a meta phrase in half and accidentally stream it.
            if (cleaned.length < prefixBuffer.length) {
              prefixBuffer = cleaned;
              continue;
            }

            // The buffer is not currently a meta phrase. If it looks like it could become
            // one, keep buffering (up to a safety cap) so we don't stream partial meta text.
            const trimmed = prefixBuffer.toLowerCase().trimStart();
            const mightBeMeta = metaPhrases.some(
              (p) => p.startsWith(trimmed) || trimmed.startsWith(p)
            );
            if (mightBeMeta && prefixBuffer.length < 2000) {
              continue;
            }

            // Safe to stream the real content.
            enqueue(prefixBuffer);
            streamedAny = true;
            prefixBuffer = "";
            continue;
          }

          enqueue(delta);
        }
        // Flush any remaining buffer if the loop finished before we decided to stream.
        if (!streamedAny && prefixBuffer) {
          enqueue(stripMetaPrefix(prefixBuffer));
        }
      } catch (err) {
        console.error("[chat] Streaming error:", err);
        const msg = "\n\nI hit an error generating that answer. Please try again.";
        assistantText += msg;
        enqueue(msg);
      }
      // Persist the assistant message BEFORE closing the stream so the client's
      // "done" signal guarantees the row is already on disk. This lets the client
      // navigate to the session URL immediately without a racy delay.
      assistantText = stripMetaPrefix(assistantText).trim();
      if (assistantText) {
        try {
          await db.insert(chatMessages).values({
            sessionId: currentSessionId,
            sourceId: resolvedId,
            role: "assistant",
            content: assistantText,
          });
          await db.insert(studySessions).values({
            type: "chat",
            sourceId: resolvedId,
            minutes: 2,
            points: image ? 5 : 3,
            detail: image ? "Photo solve session" : "AI tutor session",
          });
        } catch (err) {
          console.error("[chat] failed to persist assistant message:", err);
        }
      }
      if (!controllerClosed) {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      "X-Session-Id": String(currentSessionId),
      "X-Sources-Used": JSON.stringify({
        available: availableSourceTitles,
        used: usedSourceTitles,
      }),
    },
  });
}
