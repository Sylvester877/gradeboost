import { db } from "@/db";
import { chatMessages, chatSessions, sources } from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { TutorClient } from "@/components/tutor-client";

export const dynamic = "force-dynamic";

export default async function TutorPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; session?: string }>;
}) {
  const sp = await searchParams;
  const initialSourceId = sp.source ? Number(sp.source) : null;
  const sessionId = sp.session ? Number(sp.session) : null;

  const [sessionRows, sourceRows] = await Promise.all([
    db.select().from(chatSessions).orderBy(desc(chatSessions.createdAt)),
    db.select().from(sources),
  ]);

  let rows: { role: string; content: string }[] = [];
  if (sessionId) {
    const messages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, sessionId))
      .orderBy(asc(chatMessages.createdAt));
    rows = messages.map((r) => ({ role: r.role, content: r.content }));
  }

  const activeSession = sessionRows.find((s) => s.id === sessionId);
  const activeSourceId = activeSession?.sourceId ?? initialSourceId;
  const activeSubject = activeSession?.subject ?? "Mathematics";

  return (
    <TutorClient
      key={sessionId ?? "new"}
      sessions={sessionRows.map((s) => ({ id: s.id, title: s.title, sourceId: s.sourceId, subject: s.subject }))}
      currentSessionId={sessionId}
      initialMessages={rows as { role: "user" | "assistant"; content: string }[]}
      sources={sourceRows.map((s) => ({ id: s.id, title: s.title, topic: s.topic, subject: s.subject }))}
      initialSourceId={Number.isFinite(activeSourceId) ? activeSourceId : null}
      initialSubject={activeSubject}
    />
  );
}
