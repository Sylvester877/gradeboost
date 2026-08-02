import { db } from "@/db";
import { sources, sourceChunks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { complete, completeVision, type ContentPart } from "@/lib/openrouter";
import { chunkSource } from "@/lib/textbook-search";
import { generateEmbeddingsForSource } from "@/lib/embeddings";

/** Generate a one-sentence AI summary of a source (best-effort). */
export async function summarizeContent(title: string, content: string): Promise<string> {
  try {
    const out = await complete(
      [
        {
          role: "system",
          content:
            "Summarise the study material in ONE concise sentence (max 160 characters). Plain text only, no markdown, no quotes.",
        },
        { role: "user", content: `Title: ${title}\n\n${content.slice(0, 4000)}` },
      ],
      { temperature: 0.3, maxTokens: 90 }
    );
    return out.trim().slice(0, 180) || content.slice(0, 160);
  } catch {
    return content.slice(0, 160);
  }
}

/** Use a vision model to transcribe a textbook page photo into study text. */
export async function imageToContent(
  dataUrl: string,
  hint?: string
): Promise<string> {
  const parts: ContentPart[] = [
    {
      type: "text",
      text:
        "This is a page from an Australian Year 10 mathematics textbook (Essential Mathematics for the Australian Curriculum). " +
        "Transcribe ALL of the text exactly: headings, definitions, rules, formulae and worked examples. " +
        "Preserve mathematical expressions in a readable plain-text form. Use clear line breaks between sections. " +
        (hint ? `Focus note: ${hint}. ` : "") +
        "Output ONLY the transcribed content.",
    },
    { type: "image_url", image_url: { url: dataUrl } },
  ];
  const text = await completeVision([{ role: "user", content: parts }], {
    temperature: 0.2,
    maxTokens: 2400,
  });
  return text.trim();
}

/** Insert a source and pre-chunk it for RAG. Summary + embeddings run in the background so uploads return instantly. */
export async function createSource(input: {
  title: string;
  topic?: string | null;
  subject?: string | null;
  type?: string | null;
  content: string;
}): Promise<(typeof sources.$inferSelect)> {
  const content = input.content.trim();
  // Use a content snippet as the immediate summary — the AI-generated
  // summary runs in the background so the upload doesn't hang.
  const fallbackSummary = content.slice(0, 160).replace(/\s+/g, " ").trim();

  const created = await db.transaction(async (tx) => {
    const [source] = await tx
      .insert(sources)
      .values({
        title: input.title.trim(),
        topic: input.topic?.trim() || null,
        subject: input.subject?.trim() || "Mathematics",
        type: input.type?.trim() || "Notes",
        content,
        summary: fallbackSummary,
      })
      .returning();

    const chunks = chunkSource(content);
    if (chunks.length > 0) {
      await tx.insert(sourceChunks).values(
        chunks.map((text) => ({ sourceId: source.id, text }))
      );
    }

    return source;
  });

  // Fire-and-forget: AI summary update + embeddings. Upload returns immediately.
  summarizeContent(input.title, content)
    .then(async (summary) => {
      try {
        await db.update(sources).set({ summary }).where(eq(sources.id, created.id));
      } catch { /* best-effort */ }
    })
    .catch((err) => console.error("[sources] background summary failed:", err));

  generateEmbeddingsForSource(created.id).catch((err) =>
    console.error("[sources] background embedding generation failed:", err)
  );

  return created;
}
