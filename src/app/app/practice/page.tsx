import Link from "next/link";
import { db } from "@/db";
import { quizzes, quizAttempts, studySessions, topics } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Reveal, CountUp } from "@/components/ui";
import { TEXTBOOK_CHAPTERS } from "@/lib/chapters";
import {
  Target,
  BookOpen,
  Trophy,
  Flame,
  ArrowRight,
  ListChecks,
  Sparkles,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const [quizRows, attempts, allSessions, topicRows] = await Promise.all([
    db.select().from(quizzes).orderBy(desc(quizzes.createdAt)),
    db.select().from(quizAttempts),
    db.select().from(studySessions).orderBy(desc(studySessions.createdAt)),
    db.select().from(topics).orderBy(topics.mastery),
  ]);

  const totalAttempts = attempts.length;
  const avgScore = totalAttempts === 0
    ? 0
    : Math.round(
        (attempts.reduce((s, a) => s + (a.total ? a.score / a.total : 0), 0) / totalAttempts) * 100
      );

  // Streak from ALL sessions (not just recent)
  const days = new Set(allSessions.map((s) => s.createdAt.toISOString().slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() + 1);
  }
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const stats: {
    label: string;
    icon: typeof ListChecks;
    tint: string;
    count: number | null;
    suffix: string;
    text?: string;
  }[] = [
    {
      label: "Quizzes taken",
      count: totalAttempts,
      suffix: "",
      icon: ListChecks,
      tint: "text-violet-300",
    },
    {
      label: "Avg score",
      count: avgScore,
      suffix: "%",
      icon: Trophy,
      tint: "text-cyan-300",
    },
    {
      label: "Study streak",
      count: streak,
      suffix: "🔥",
      icon: Flame,
      tint: "text-orange-300",
    },
    {
      label: "Weakest topic",
      text: topicRows.length > 0 ? topicRows[0].name : "N/A",
      count: null,
      suffix: "",
      icon: Target,
      tint: "text-pink-300",
    },
  ];

  const quickActions = [
    { href: "/app/tutor", label: "Ask AI Tutor", desc: "Get step-by-step help", icon: Sparkles },
    { href: "/app/quizzes", label: "Take a Quiz", desc: "Test your knowledge", icon: ListChecks },
    { href: "/app/flashcards", label: "Revise Cards", desc: "Lock in key concepts", icon: BookOpen },
    { href: "/app/textbook", label: "Browse Textbook", desc: "Search by chapter", icon: BookOpen },
  ];

  const recentSessions = allSessions.slice(0, 5);

  return (
    <div className="space-y-8 py-2">
      <Reveal>
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Practice</h1>
          <p className="mt-1 text-slate-400">
            Pick a chapter, take a quiz, or ask the AI tutor — build mastery one topic at a time.
          </p>
        </div>
      </Reveal>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.label} delay={i * 0.05}>
              <div className="glass flex items-center gap-4 rounded-2xl p-5 transition-all hover:bg-white/8 hover:scale-[1.02]">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white/5">
                  <Icon className={cn("h-5 w-5", s.tint)} />
                </div>
                <div className="min-w-0">
                  <p className="font-display text-xl font-bold text-white truncate">
                    {s.count !== null ? (
                      <CountUp value={s.count} suffix={s.suffix} />
                    ) : (
                      s.text
                    )}
                  </p>
                  <p className="text-xs text-slate-400 truncate">{s.label}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      {/* Chapter browser */}
      <Reveal delay={0.1}>
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-violet-300" />
            <h2 className="font-display text-lg font-semibold text-white">Practice by chapter</h2>
            <span className="text-xs text-slate-500 ml-auto">Essential Mathematics Year 10</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TEXTBOOK_CHAPTERS.map((ch, i) => {
              const Icon = ch.icon;
              return (
                <div
                  key={ch.num}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/20 hover:scale-[1.01]"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br",
                      ch.color
                    )}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                        Chapter {ch.num}
                      </span>
                      <h3 className="mt-0.5 text-sm font-medium text-white leading-snug line-clamp-2">
                        {ch.title}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <Link
                          href={`/app/quizzes?topic=${encodeURIComponent(`Chapter ${ch.num}`)}`}
                          className="inline-flex items-center gap-1 rounded-md bg-violet-500/15 px-2 py-1 text-[11px] text-violet-200 transition hover:bg-violet-500/25"
                        >
                          <ListChecks className="h-3 w-3" /> Quiz
                        </Link>
                        <Link
                          href={`/app/tutor?subject=Mathematics&topic=${encodeURIComponent(`Chapter ${ch.num}`)}`}
                          className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2 py-1 text-[11px] text-cyan-200 transition hover:bg-cyan-500/25"
                        >
                          <Sparkles className="h-3 w-3" /> Ask AI
                        </Link>
                      </div>
                    </div>
                    <Link
                      href={`/app/tutor?subject=Mathematics&topic=Chapter ${ch.num}: ${ch.title}`}
                      className="mt-2 shrink-0"
                    >
                      <ArrowRight className="h-4 w-4 text-slate-600 transition-all group-hover:translate-x-0.5 group-hover:text-white" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </Reveal>

      {/* Quick actions + recent */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick actions */}
        <Reveal delay={0.05} className="lg:col-span-2">
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <Target className="h-5 w-5 text-cyan-300" />
              <h2 className="font-display text-lg font-semibold text-white">Quick actions</h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {quickActions.map((q) => {
                const Icon = q.icon;
                return (
                  <Link
                    key={q.href}
                    href={q.href}
                    className="group flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-white/20 hover:scale-[1.01]"
                  >
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/30 to-cyan-500/20">
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{q.label}</p>
                      <p className="text-xs text-slate-400">{q.desc}</p>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-600 transition-all group-hover:translate-x-1 group-hover:text-white" />
                  </Link>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* Recent activity */}
        <Reveal delay={0.1} className="lg:col-span-1">
          <div className="glass h-full rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-pink-300" />
              <h2 className="font-display text-lg font-semibold text-white">Recent</h2>
            </div>
            {recentSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Target className="mb-2 h-8 w-8 text-slate-500" />
                <p className="text-sm text-slate-400">No activity yet</p>
                <p className="text-xs text-slate-500">Start a quiz or ask the tutor</p>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentSessions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between gap-2 rounded-lg bg-white/5 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-sm text-slate-200 truncate">
                        {s.detail || `${s.type} session`}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(s.createdAt).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-gradient-to-r from-violet-500/20 to-cyan-500/20 px-2 py-0.5 text-xs font-semibold text-violet-200">
                      +{s.points}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Reveal>
      </div>

      {/* Bottom CTA */}
      <Reveal delay={0.15}>
        <div className="glass relative overflow-hidden rounded-2xl p-6 text-center">
          <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-violet-500/20 blur-3xl" />
          <div className="absolute -left-10 -bottom-10 h-40 w-40 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="relative">
            <h2 className="font-display text-xl font-semibold text-white">
              Ready to level up? 🚀
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Generate a quiz, revise with flashcards, or get instant AI help on any topic.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              <Link
                href="/app/quizzes"
                className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm"
              >
                <ListChecks className="h-4 w-4" /> Generate a quiz
              </Link>
              <Link
                href="/app/tutor"
                className="glass inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm text-white transition hover:bg-white/8"
              >
                <Sparkles className="h-4 w-4" /> Ask AI Tutor
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
