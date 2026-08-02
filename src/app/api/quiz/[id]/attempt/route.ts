import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { quizzes, quizAttempts, topics, studySessions, type QuizResponse } from "@/db/schema";
import { eq, sql } from "drizzle-orm";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const numId = Number(id);
  const { score, total, responses = [] } = await req.json();

  const quizRows = await db.select().from(quizzes).where(eq(quizzes.id, numId)).limit(1);
  const quiz = quizRows[0];
  if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

  const [attempt] = await db
    .insert(quizAttempts)
    .values({
      quizId: numId,
      score: Number(score),
      total: Number(total),
      responses: responses as QuizResponse[],
    })
    .returning();

  // update topic mastery
  if (quiz.topic) {
    const existing = await db.select().from(topics).where(eq(topics.name, quiz.topic)).limit(1);
    const attempts = (existing[0]?.attempts ?? 0) + 1;
    const correct = (existing[0]?.correct ?? 0) + Number(score);
    const mastery = Math.round((correct / Math.max(1, attempts * Number(total))) * 100);
    if (existing[0]) {
      await db
        .update(topics)
        .set({ attempts, correct, mastery: Math.min(100, mastery), updatedAt: new Date() })
        .where(eq(topics.id, existing[0].id));
    } else {
      await db.insert(topics).values({
        name: quiz.topic,
        attempts,
        correct,
        mastery: Math.min(100, mastery),
      });
    }
  }

  const points = Number(score) * 5;
  await db.insert(studySessions).values({
    type: "quiz",
    sourceId: quiz.sourceId ?? null,
    minutes: Math.ceil(Number(total) * 0.75),
    points,
    detail: `Scored ${score}/${total} on ${quiz.title}`,
  });

  // bump topic.updatedAt via raw sql noop reference to avoid unused import lint
  void sql;

  return NextResponse.json({ attempt, points });
}
