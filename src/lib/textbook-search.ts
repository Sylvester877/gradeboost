import { db } from "@/db";
import { sources, sourceChunks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getEmbedding } from "@/lib/embeddings";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

export const MAX_SOURCE_CHUNKS_PER_SOURCE = 10;
const MIN_FRAGMENT_LENGTH = 80;

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "is", "and", "or", "for", "on", "with",
  "that", "this", "it", "be", "are", "as", "at", "by", "we", "you", "find",
  "what", "how", "explain", "do", "does", "can", "i", "me", "my", "please",
  "tell", "about", "into", "use", "using", "show", "give", "help", "will",
  "from", "when", "where", "which", "who", "have", "has", "had", "not",
  "but", "if", "then", "than", "so", "very", "just", "only", "now", "also",
  "each", "every", "all", "any", "some", "many", "much", "more", "most",
  "other", "another", "such", "no", "yes", "essential", "mathematics",
  "australian", "curriculum", "cambridge", "university", "press", "greenwood",
  "isbn", "photocopying", "restricted", "under", "law", "contents",
  "chapter", "review", "checklist", "exercise",
]);

export interface TextbookChunk {
  id: number;
  text: string;
  embedding?: number[] | null;
}

interface TextbookData {
  source: string;
  chunks: TextbookChunk[];
  index: {
    df: Record<string, number>;
    tf: Record<string, number>[];
    n: number;
  };
}

let _data: TextbookData | null = null;
function getData(): TextbookData {
  if (_data) return _data;
  const candidates = [
    resolve(process.cwd(), "textbook.json"),           // standalone / Electron
    resolve(process.cwd(), "src/lib/textbook.json"),   // dev (project root)
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      _data = JSON.parse(readFileSync(p, "utf8")) as TextbookData;
      return _data;
    }
  }
  throw new Error("textbook.json not found in " + candidates.join(" or "));
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/\$[^$]*\$/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

export function scoreChunks(query: string, chunks: TextbookChunk[]): { chunk: TextbookChunk; score: number }[] {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];

  const qWeights = new Map<string, number>();
  for (const tok of qTokens) {
    qWeights.set(tok, (qWeights.get(tok) ?? 0) + 1);
  }

  const scored = chunks.map((chunk) => {
    const tfMap = tokenize(chunk.text);
    const freq = new Map<string, number>();
    for (const t of tfMap) freq.set(t, (freq.get(t) ?? 0) + 1);

    let score = 0;
    for (const [tok, qw] of qWeights) {
      const f = freq.get(tok) ?? 0;
      if (f > 0) score += qw * (1 + Math.log(f));
    }
    return { chunk, score };
  });

  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
}

/** Split long source text into paragraph-sized chunks, enforcing chunkSize. */
export function chunkSource(content: string, chunkSize = 1200, overlap = 200): string[] {
  const paragraphs = content
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 40);

  const out: string[] = [];
  let current = "";
  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > chunkSize && current.length) {
      out.push(current.trim());
      current = overlap > 0 ? current.slice(-overlap) + "\n\n" + p : p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current.trim()) out.push(current.trim());

  // Enforce chunkSize: any oversized chunk is split with overlap; merge tiny trailing fragments into the previous chunk.
  const safe: string[] = [];
  for (const chunk of out.length ? out : [content]) {
    if (chunk.length <= chunkSize) {
      safe.push(chunk);
      continue;
    }
    for (let i = 0; i < chunk.length; i += chunkSize - overlap) {
      const piece = chunk.slice(i, i + chunkSize);
      if (piece.trim().length === 0) continue;
      const prev = safe.length > 0 ? safe[safe.length - 1] : "";
      if (piece.trim().length < MIN_FRAGMENT_LENGTH && safe.length > 0 && prev.length + piece.trim().length <= chunkSize * 1.5) {
        safe[safe.length - 1] = prev + "\n\n" + piece.trim();
      } else {
        safe.push(piece);
      }
    }
  }
  // Ensure very short sources always produce at least one chunk.
  if (safe.length === 0 && content.trim().length > 0) {
    safe.push(content.trim());
  }
  return safe;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0 || a.length !== b.length) return -1;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  if (denom === 0) return -1;
  return dot / denom;
}

/** Rank a list of chunks by semantic embedding similarity to the query.
 *  Falls back to keyword scoring when embeddings are not available.
 */
export async function rankChunks(
  query: string,
  chunks: TextbookChunk[],
  topK = 5
): Promise<TextbookChunk[]> {
  if (chunks.length === 0) return [];

  const hasEmbeddings = chunks.some((c) => c.embedding && c.embedding.length > 0);
  const queryEmbedding = hasEmbeddings ? await getEmbedding(query) : null;

  if (queryEmbedding && hasEmbeddings) {
    const scored = chunks.map((chunk) => ({
      chunk,
      score: chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : -1,
    }));
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => s.chunk);
  }

  const scored = scoreChunks(query, chunks);
  if (scored.length === 0) return chunks.slice(0, topK);
  return scored.slice(0, topK).map((s) => s.chunk);
}

/** Rank chunks pulled from MULTIPLE sources while guaranteeing per-source diversity.
 *  Uses a single query embedding for every chunk (fast), then greedily picks the
 *  highest-scoring chunks, capping how many can come from one source so no single
 *  source crowds out the rest. Falls back to keyword scoring without embeddings.
 */
type Tagged = { id: number; text: string; embedding?: number[] | null; title: string };

/** Rank chunks pulled from MULTIPLE sources while guaranteeing per-source diversity.
 *  Uses a single query embedding for every chunk (fast), then greedily picks the
 *  highest-scoring chunks, capping how many can come from one source so no single
 *  source crowds out the rest. Falls back to keyword scoring without embeddings.
 */
export async function rankChunksWithDiversity<T extends Tagged>(
  query: string,
  chunks: T[],
  topK = 10,
  maxPerSource = 3
): Promise<T[]> {
  if (chunks.length === 0) return [];

  const hasEmbeddings = chunks.some((c) => c.embedding && c.embedding.length > 0);
  const queryEmbedding = hasEmbeddings ? await getEmbedding(query) : null;

  let scored: { chunk: T; score: number }[];
  if (queryEmbedding && hasEmbeddings) {
    scored = chunks.map((chunk) => ({
      chunk,
      score: chunk.embedding ? cosineSimilarity(queryEmbedding, chunk.embedding) : -1,
    }));
  } else {
    const kw = scoreChunks(query, chunks);
    scored = kw.map(({ chunk, score }) => ({ chunk: chunk as unknown as T, score }));
    if (scored.length === 0) {
      // Nothing matched keyword-wise — fall back to a spread of the chunks
      // so the model still sees a slice of every source.
      scored = chunks.map((chunk) => ({ chunk, score: 0 }));
    }
  }

  scored.sort((a, b) => b.score - a.score);

  const perSource = new Map<string, number>();
  const out: T[] = [];
  for (const { chunk } of scored) {
    const used = perSource.get(chunk.title) ?? 0;
    if (used >= maxPerSource) continue;
    perSource.set(chunk.title, used + 1);
    out.push(chunk);
    if (out.length >= topK) break;
  }

  // Top up to topK with the next-best chunks if the per-source cap was too tight.
  if (out.length < topK) {
    for (const { chunk } of scored) {
      if (out.includes(chunk)) continue;
      out.push(chunk);
      if (out.length >= topK) break;
    }
  }
  return out;
}

/** Retrieve relevant chunks for a given subject. For Mathematics, use the pre-built textbook.json index.
 *  For other subjects, sources stored in the DB with that subject are searched on the fly.
 */
export async function retrieve(query: string, subject?: string, topK = 5): Promise<TextbookChunk[]> {
  const normalizedSubject = subject?.trim() || "Mathematics";

  if (normalizedSubject === "Mathematics") {
    const qTokens = tokenize(query);
    if (qTokens.length === 0) return [];

    const qWeights = new Map<string, number>();
    for (const tok of qTokens) {
      const df = getData().index.df[tok] ?? 0;
      const idf = df === 0 ? 0 : Math.log(1 + getData().index.n / df);
      qWeights.set(tok, (qWeights.get(tok) ?? 0) + idf);
    }

    const scored = getData().chunks.map((chunk, i) => {
      const tfMap = getData().index.tf[i];
      let score = 0;
      for (const [tok, qw] of qWeights) {
        const freq = tfMap[tok] ?? 0;
        if (freq > 0) score += qw * (1 + Math.log(freq));
      }
      return { chunk, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .map((s) => s.chunk);
  }

  // For non-math subjects, fetch matching sources from the DB and score on the fly.
  const subjectSources = await db.select().from(sources).where(eq(sources.subject, normalizedSubject));
  if (subjectSources.length === 0) return [];

  const allChunks: TextbookChunk[] = [];
  let id = 1;
  for (const s of subjectSources) {
    // Prefer pre-computed chunks; fall back to chunking the full content for older sources.
    const stored = await db
      .select()
      .from(sourceChunks)
      .where(eq(sourceChunks.sourceId, s.id))
      .orderBy(sourceChunks.id);
    const chunks =
      stored.length > 0
        ? stored.map((c) => ({ id: c.id, text: c.text, embedding: c.embedding }))
        : chunkSource(s.content).map((text, idx) => ({ id: idx, text, embedding: undefined as number[] | undefined }));

    for (const chunk of chunks.slice(0, MAX_SOURCE_CHUNKS_PER_SOURCE)) {
      allChunks.push({ id: id++, text: `[${s.title}]\n${chunk.text}`, embedding: chunk.embedding });
    }
  }

  if (allChunks.length === 0) return [];
  return rankChunks(query, allChunks, topK);
}

export function getAllChunks(): TextbookChunk[] {
  return getData().chunks;
}

export function getSourceName(): string {
  return getData().source;
}
