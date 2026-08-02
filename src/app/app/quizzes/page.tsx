import Link from "next/link";
import { db } from "@/db";
import { quizzes, quizAttempts, sources } from "@/db/schema";
import { desc } from "drizzle-orm";
import { QuizGenerator } from "@/components/quiz-generator";
import { CountUp } from "@/components/ui";
import { timeAgo, scoreColor, cn } from "@/lib/utils";
import { ListChecks, ChevronRight, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function QuizzesPage({
  searchParams,
}: {
  searchParams: Promise<{ source?: string; topic?: string }>;
}) {
  const sp = await searchParams;
  const initialSource = sp.source ? Number(sp.source) : null;
  const initialTopic = sp.topic ? String(sp.topic) : "";

  const [rows, attempts, sourceRows] = await Promise.all([
    db.select().from(quizzes).orderBy(desc(quizzes.createdAt)),
    db.select().from(quizAttempts),
    db.select().from(sources),
  ]);

  const bestByQuiz = new Map<number, { best: number; total: number; tries: number }>();
  for (const a of attempts) {
    const cur = bestByQuiz.get(a.quizId);
    const pct = a.total ? a.score / a.total : 0;
    if (!cur) bestByQuiz.set(a.quizId, { best: pct, total: a.total, tries: 1 });
    else {
      cur.tries += 1;
      if (pct > cur.best) {
        cur.best = pct;
        cur.total = a.total;
      }
    }
  }

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Quizzes</h1>
        <p className="mt-1 text-slate-400">Generate exam-style quizzes and track your scores.</p>
      </div>

      <QuizGenerator
        sources={sourceRows.map((s) => ({ id: s.id, title: s.title, topic: s.topic, subject: s.subject }))}
        initialSource={initialSource}
        initialTopic={initialTopic}
      />

      <div>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-white">
          <ListChecks className="h-5 w-5 text-cyan-300" /> Your quizzes
        </h2>

        {rows.length === 0 ? (
          <div className="glass rounded-2xl p-10 text-center text-slate-400">
            No quizzes yet — generate one above to get started.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((qz, i) => {
              const best = bestByQuiz.get(qz.id);
              const pct = best ? Math.round(best.best * 100) : null;
              return (
                <Link
                  key={qz.id}
                  href={`/app/quizzes/${qz.id}`}
                  className="glass group flex items-center justify-between rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/8 hover:shadow-lg hover:shadow-violet-500/10"
                >
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-white">{qz.title}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                      <span>{qz.questions.length} questions</span>
                      <span className="capitalize">{qz.difficulty}</span>
                      {qz.topic && <span className="text-violet-300">{qz.topic}</span>}
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {timeAgo(qz.createdAt)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-3">
                    {pct !== null ? (
                      <div className="text-right">
                        <p className={cn("font-display text-xl font-bold", scoreColor(pct))}>
                          <CountUp value={pct} suffix="%" />
                        </p>
                        <p className="text-[10px] text-slate-500">
                          {best?.tries} {best?.tries === 1 ? "try" : "tries"}
                        </p>
                      </div>
                    ) : (
                      <span className="rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-slate-400">
                        New
                      </span>
                    )}
                    <ChevronRight className="h-5 w-5 text-slate-500 transition-transform duration-300 group-hover:translate-x-1 group-hover:text-white" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
