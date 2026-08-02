import { db } from "@/db";
import { flashcards, sources } from "@/db/schema";
import { desc } from "drizzle-orm";
import { FlashcardsClient } from "@/components/flashcards-client";

export const dynamic = "force-dynamic";

export default async function FlashcardsPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; topic?: string }>;
}) {
  const sp = await searchParams;
  const initialSource = sp.source ? Number(sp.source) : null;
  const initialTopic = sp.topic ? String(sp.topic) : "";

  const [rows, sourceRows] = await Promise.all([
    db.select().from(flashcards).orderBy(desc(flashcards.createdAt)),
    db.select().from(sources),
  ]);
  const cards = rows.map((r) => ({ id: r.id, front: r.front, back: r.back }));
  return (
    <FlashcardsClient
      initial={cards}
      sources={sourceRows.map((s) => ({ id: s.id, title: s.title, topic: s.topic, subject: s.subject }))}
      initialSource={initialSource}
      initialTopic={initialTopic}
    />
  );
}
