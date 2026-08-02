import fs from "fs";
import path from "path";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { sources } from "../src/db/schema";

const TEXTBOOK_PATH = path.resolve(process.cwd(), "..", "textbook.txt");

function clean(text: string): string {
  return text.replace(/\u0000/g, "").replace(/[ \t]+\n/g, "\n").trim();
}

async function main() {
  if (!fs.existsSync(TEXTBOOK_PATH)) {
    throw new Error(`Textbook text not found at ${TEXTBOOK_PATH}`);
  }

  // Remove any previously seeded textbook sources so the script is idempotent.
  const deleted = await db.delete(sources).where(eq(sources.topic, "Textbook")).returning();
  console.log(`Cleared ${deleted.length} previous textbook sources.`);

  const raw = fs.readFileSync(TEXTBOOK_PATH, "utf-8");
  const content = clean(raw);
  const summary = content.slice(0, 160).replace(/\s+/g, " ").trim();

  const [created] = await db
    .insert(sources)
    .values({
      title: "Essential Mathematics for the Australian Curriculum (Year 10, 4th Edition)",
      topic: "Textbook",
      subject: "Mathematics",
      type: "Textbook",
      content,
      summary,
    })
    .returning();

  console.log(`Inserted source #${created.id}: ${created.title}`);
  console.log("Textbook seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
