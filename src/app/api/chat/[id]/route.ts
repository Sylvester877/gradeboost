import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { chatMessages, chatSessions } from "@/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const numId = Number(id);
  if (!Number.isFinite(numId) || numId <= 0) {
    return NextResponse.json({ error: "Invalid session id" }, { status: 400 });
  }

  const existing = await db
    .select({ id: chatSessions.id })
    .from(chatSessions)
    .where(eq(chatSessions.id, numId))
    .limit(1);
  if (!existing[0]) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  await db.delete(chatMessages).where(eq(chatMessages.sessionId, numId));
  await db.delete(chatSessions).where(eq(chatSessions.id, numId));
  return NextResponse.json({ ok: true });
}
