import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const TXT_PATH = resolve(ROOT, "..", "textbook.txt");
const OUT_DIR = resolve(ROOT, "src", "lib");

const CHUNK_SIZE = 1500;
const OVERLAP = 300;

const STOPWORDS = new Set([
  "the", "a", "an", "of", "to", "in", "is", "and", "or", "for", "on", "with",
  "that", "this", "it", "be", "are", "as", "at", "by", "we", "you", "find",
  "what", "how", "explain", "do", "does", "can", "i", "me", "my", "please",
  "tell", "about", "into", "use", "using", "show", "give", "help", "the",
  "will", "from", "into", "when", "where", "which", "who", "whom", "whose",
  "have", "has", "had", "not", "but", "if", "then", "than", "so", "very",
  "just", "only", "now", "also", "each", "every", "all", "any", "some",
  "many", "much", "more", "most", "other", "another", "such", "no", "yes",
  "essential", "mathematics", "australian", "curriculum", "cambridge", "university",
  "press", "greenwood", "isbn", "photocopying", "restricted", "under", "law",
  "contents", "contents", "chapter", "review", "checklist", "exercise",
]);

function tokenize(text) {
  return text
    .toLowerCase()
    .replace(/\$[^$]*\$/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function cleanText(raw) {
  return raw
    .replace(/\f/g, "\n")
    .replace(/Essential Mathematics for the Australian Curriculum.*?© Greenwood et al\. \d{4} Cambridge University Press/g, "")
    .replace(/Photocopying is restricted under law\./g, "")
    .replace(/This page is not part of the preview\./g, "")
    .replace(/ISBN\s+[\d\-]+/g, "")
    .replace(/www\.cambridge\.edu\.au\/GO/g, "")
    .replace(/Year 10/g, "")
    .replace(/-{3,}/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function chunkText(text) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    const end = Math.min(i + CHUNK_SIZE, text.length);
    chunks.push(text.slice(i, end));
    if (end >= text.length) break;
    i += CHUNK_SIZE - OVERLAP;
  }
  return chunks;
}

async function main() {
  if (!existsSync(TXT_PATH)) {
    console.error(`Textbook text not found at ${TXT_PATH}`);
    process.exit(1);
  }

  const raw = await readFile(TXT_PATH, "utf8");
  const clean = cleanText(raw);
  const chunks = chunkText(clean);

  const df = new Map();
  const index = chunks.map((text, id) => {
    const tokens = tokenize(text);
    const tf = new Map();
    for (const t of tokens) {
      tf.set(t, (tf.get(t) ?? 0) + 1);
      df.set(t, (df.get(t) ?? 0) + 1);
    }
    return { id, text, tf: Object.fromEntries(tf) };
  });

  const result = {
    source: "EMAC10_4ed_complete",
    chunks: index.map(({ id, text }) => ({ id, text })),
    index: {
      df: Object.fromEntries(df),
      // chunk id -> tf map
      tf: index.map((c) => c.tf),
      n: index.length,
    },
  };

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(resolve(OUT_DIR, "textbook.json"), JSON.stringify(result));
  console.log(`Ingested ${chunks.length} chunks to src/lib/textbook.json`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
