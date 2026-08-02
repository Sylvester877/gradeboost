import Link from "next/link";
import { db } from "@/db";
import { topics, quizAttempts, studySessions, sources } from "@/db/schema";
import { ProgressRing, Reveal, CountUp, AnimatedBar } from "@/components/ui";
import { toGrade, timeAgo, cn } from "@/lib/utils";
import {
  MessagesSquare,
  ListChecks,
  Layers,
  BookOpen,
  Flame,
  Trophy,
  TrendingUp,
  Target,
  ArrowRight,
  Plus,
  Sparkles,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getData() {
  const [topicRows, attempts, sessions, sourceRows] = await Promise.all([
    db.select().from(topics).orderBy(topics.mastery),
    db.select().from(quizAttempts),
    db.select().from(studySessions),
    db.select().from(sources),
  ]);

  const avgMastery =
    topicRows.length === 0
      ? 0
      : Math.round(topicRows.reduce((s, t) => s + t.mastery, 0) / topicRows.length);

  const totalQuizzes = attempts.length;
  const avgScore =
    totalQuizzes === 0
      ? 0
      : Math.round(
          (attempts.reduce((s, a) => s + (a.total ? a.score / a.total : 0), 0) /
            totalQuizzes) *
            100
        );

  const totalPoints = sessions.reduce((s, x) => s + x.points, 0);

  // streak
  const days = new Set(sessions.map((s) => s.createdAt.toISOString().slice(0, 10)));
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

  const recent = [...sessions].reverse().slice(0, 6);

  return {
    topicRows,
    avgMastery,
    totalQuizzes,
    avgScore,
    totalPoints,
    streak,
    recent,
    sourceCount: sourceRows.length,
  };
}

export default async function Dashboard() {
  const data = await getData();
  const projectedGrade = toGrade(data.avgMastery);

  const stats = [
    {
      label: "Overall mastery",
      value: `${data.avgMastery}%`,
      icon: TrendingUp,
      tint: "text-violet-300",
    },
    {
      label: "Avg quiz score",
      value: `${data.avgScore}%`,
      icon: Trophy,
      tint: "text-cyan-300",
    },
    { label: "Study streak", value: `${data.streak}🔥`, icon: Flame, tint: "text-orange-300" },
    { label: "XP points", value: data.totalPoints, icon: Sparkles, tint: "text-pink-300" },
  ];

  const quick = [
    { href: "/app/tutor", label: "Ask the tutor", icon: MessagesSquare, desc: "Get unstuck fast" },
    { href: "/app/quizzes", label: "Take a quiz", icon: ListChecks, desc: "Test yourself" },
    {
      href: "/app/flashcards",
      label: "Revise cards",
      icon: Layers,
      desc: "Lock in the basics",
    },
    {
      href: "/app/sources",
      label: "Add a source",
      icon: BookOpen,
      desc: "Feed your textbook",
    },
  ];

  return (
    <div className="space-y-8 py-2">
      {/* header */}
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">Welcome back 👋</h1>
            <p className="mt-1 text-slate-400">
              You&apos;re tracking toward a{" "}
              <span className="font-semibold gradient-text">Grade {projectedGrade}</span>. Let&apos;s
              push higher today.
            </p>
          </div>
          <Link
            href="/app/tutor"
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
          >
            <Sparkles className="h-4 w-4" /> Start a study session
          </Link>
        </div>
      </Reveal>

      {/* stat strip */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <Reveal key={s.label} delay={i * 0.05}>
              <div className="glass group flex items-center gap-4 rounded-2xl p-5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/8 hover:shadow-lg hover:shadow-violet-500/10">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 transition-transform duration-300 group-hover:scale-110">
                  <Icon className={cn("h-5 w-5", s.tint)} />
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-white">
                    <CountUp value={Number(String(s.value).replace(/[^0-9]/g, ""))} suffix={String(s.value).replace(/[0-9]/g, "")} />
                  </p>
                  <p className="text-xs text-slate-400">{s.label}</p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* mastery ring + grade goal */}
        <Reveal className="lg:col-span-1">
          <div className="glass flex h-full flex-col items-center justify-center rounded-2xl p-6">
            <div className="mb-3 flex items-center gap-2 self-start text-sm text-slate-400">
              <Target className="h-4 w-4 text-violet-300" /> Grade projection
            </div>
            <ProgressRing
              value={data.avgMastery}
              label={`${data.avgMastery}%`}
              sublabel={`Grade ${projectedGrade}`}
            />
            <p className="mt-4 text-center text-sm text-slate-400">
              {data.avgMastery >= 85
                ? "Outstanding — you're exam-ready! 🔥"
                : data.avgMastery >= 70
                ? "Strong work. A few weak topics to polish."
                : "Solid base. Focus on your weakest topics first."}
            </p>
          </div>
        </Reveal>

        {/* topic mastery bars */}
        <Reveal delay={0.1} className="lg:col-span-2">
          <div className="glass h-full rounded-2xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-white">Topic mastery</h2>
              <span className="text-xs text-slate-400">{data.topicRows.length} topics</span>
            </div>
            <div className="space-y-3.5">
              {data.topicRows.slice(0, 6).map((t, i) => (
                <div key={t.id}>
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="text-slate-200">{t.name}</span>
                    <span
                      className={cn(
                        "font-medium",
                        t.mastery >= 70
                          ? "text-emerald-400"
                          : t.mastery >= 40
                          ? "text-amber-400"
                          : "text-rose-400"
                      )}
                    >
                      {t.mastery}%
                    </span>
                  </div>
                  <AnimatedBar
                    value={t.mastery}
                    delay={i * 0.06}
                    barClassName={
                      t.mastery >= 70
                        ? "bg-gradient-to-r from-emerald-500 to-teal-400"
                        : t.mastery >= 40
                        ? "bg-gradient-to-r from-amber-500 to-orange-400"
                        : "bg-gradient-to-r from-rose-500 to-pink-400"
                    }
                  />
                </div>
              ))}
              {data.topicRows.length === 0 && (
                <p className="text-sm text-slate-400">
                  Take a quiz to start tracking mastery by topic.
                </p>
              )}
            </div>
          </div>
        </Reveal>
      </div>

      {/* quick actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quick.map((q, i) => {
          const Icon = q.icon;
          return (
            <Reveal key={q.href} delay={i * 0.05}>
              <Link
                href={q.href}
                className="glass group block rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/8 hover:shadow-xl hover:shadow-violet-500/10"
              >
                <div className="flex items-center justify-between">
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <ArrowRight className="h-4 w-4 text-slate-500 transition-transform duration-300 group-hover:translate-x-1.5 group-hover:-rotate-6 group-hover:text-white" />
                </div>
                <p className="mt-3 font-medium text-white">{q.label}</p>
                <p className="text-xs text-slate-400">{q.desc}</p>
              </Link>
            </Reveal>
          );
        })}
      </div>

      {/* recent activity */}
      <Reveal>
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-white">Recent activity</h2>
            <Link
              href="/app/sources"
              className="inline-flex items-center gap-1 text-xs text-violet-300 hover:text-violet-200"
            >
              <Plus className="h-3.5 w-3.5" /> Add source
            </Link>
          </div>
          {data.recent.length === 0 ? (
            <p className="text-sm text-slate-400">
              No activity yet — ask the AI tutor a question to get started.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {data.recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-slate-300">
                    {s.detail || `${s.type} session`}
                  </span>
                  <span className="text-xs text-slate-500">
                    {timeAgo(s.createdAt)} · +{s.points} XP
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Reveal>
    </div>
  );
}
