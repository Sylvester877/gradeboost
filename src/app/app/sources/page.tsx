import { db } from "@/db";
import { sources } from "@/db/schema";
import { desc } from "drizzle-orm";
import { SourcesClient } from "@/components/sources-client";

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const rows = await db.select().from(sources).orderBy(desc(sources.createdAt));
  const initial = rows.map((r) => ({
    id: r.id,
    title: r.title,
    topic: r.topic,
    subject: r.subject,
    type: r.type,
    content: r.content,
    summary: r.summary,
    createdAt: r.createdAt.toISOString(),
  }));
  return <SourcesClient initial={initial} />;
}
