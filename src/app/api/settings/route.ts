import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hasApiKey, TEXT_MODELS, VISION_MODELS } from "@/lib/openrouter";

export async function GET() {
  const rows = await db.select().from(settings);
  const obj: Record<string, string> = {};
  for (const r of rows) obj[r.key] = r.value;
  return NextResponse.json({
    ...obj,
    aiEnabled: hasApiKey(),
    model: TEXT_MODELS[0]?.id || "",
    visionModel: VISION_MODELS[0]?.id || "",
  });
}

export async function POST(req: NextRequest) {
  const { key, value } = await req.json();
  if (typeof key !== "string" || typeof value !== "string") {
    return NextResponse.json({ error: "key and value required" }, { status: 400 });
  }
  const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (existing[0]) {
    await db.update(settings).set({ value }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value });
  }
  return NextResponse.json({ ok: true });
}
