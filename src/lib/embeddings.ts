import { db } from "@/db";
import { sourceChunks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { embedding, hasApiKey } from "@/lib/openrouter";

/**
 * Generate an embedding vector using OpenRouter's free embedding API.
 * Falls back to null on any error — callers use keyword scoring as backup.
 */
export async function getEmbedding(text: string): Promise<number[] | null> {
  if (!hasApiKey() || !text.trim()) return null;
  return embedding(text.trim());
}

/**
 * Generate embeddings for every chunk of a source and persist them.
 * Runs as a background task after upload — the upload returns immediately.
 */
export async function generateEmbeddingsForSource(sourceId: number) {
  try {
    const chunks = await db
      .select({ id: sourceChunks.id, text: sourceChunks.text })
      .from(sourceChunks)
      .where(eq(sourceChunks.sourceId, sourceId));

    if (chunks.length === 0) return;

    console.log(
      `[embeddings] generating embeddings for source ${sourceId} (${chunks.length} chunks)...`
    );

    const batchSize = 5;
    let saved = 0;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const batchVectors = await Promise.all(
        batch.map((chunk) => getEmbedding(chunk.text))
      );
      for (let j = 0; j < batch.length; j++) {
        const vec = batchVectors[j];
        if (vec) {
          await db
            .update(sourceChunks)
            .set({ embedding: vec })
            .where(eq(sourceChunks.id, batch[j].id));
          saved++;
        }
      }
    }

    console.log(
      `[embeddings] source ${sourceId}: saved ${saved}/${chunks.length} embeddings`
    );
  } catch (err) {
    console.error(
      `[embeddings] failed to generate embeddings for source ${sourceId}:`,
      err
    );
  }
}
