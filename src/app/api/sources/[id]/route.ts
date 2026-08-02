import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sources, chatMessages } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const numId = Number(id);
  await db.delete(chatMessages).where(eq(chatMessages.sourceId, numId));
  await db.delete(sources).where(eq(sources.id, numId));
  return NextResponse.json({ ok: true });
}
