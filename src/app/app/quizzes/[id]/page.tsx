import { notFound } from "next/navigation";
import { db } from "@/db";
import { quizzes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { QuizPlayer, type Q } from "@/components/quiz-player";

export const dynamic = "force-dynamic";

export default async function QuizDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const rows = await db.select().from(quizzes).where(eq(quizzes.id, Number(id))).limit(1);
  const quiz = rows[0];
  if (!quiz) notFound();

  return (
    <QuizPlayer
      quizId={quiz.id}
      title={quiz.title}
      topic={quiz.topic}
      questions={quiz.questions as Q[]}
    />
  );
}
