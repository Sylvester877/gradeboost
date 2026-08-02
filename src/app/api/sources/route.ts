import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { desc } from "drizzle-orm";
import { createSource } from "@/lib/sources";

export async function GET() {
  const rows = await db.select().from(sources).orderBy(desc(sources.createdAt));
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  if (!title || !content) {
    return NextResponse.json({ error: "Title and content are required." }, { status: 400 });
  }
  const created = await createSource({
    title,
    topic: body.topic ?? null,
    subject: body.subject ?? null,
    type: body.type ?? null,
    content,
  });
  return NextResponse.json(created);
}
