import { db } from "@/db";
import { flashcards } from "@/db/schema";
import { desc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(flashcards).orderBy(desc(flashcards.createdAt));
  return Response.json(rows);
}
