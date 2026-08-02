"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkles, Loader2, Wand2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type SourceLite = { id: number; title: string; topic: string | null; subject: string };

const SUBJECT_OPTIONS = [
  "Mathematics",
  "Science",
  "English",
  "History",
  "Geography",
  "Languages",
  "Other",
];

const DIFFICULTIES = ["mixed", "easy", "hard"] as const;

export function QuizGenerator({
  sources,
  initialSource = null,
  initialTopic = "",
  initialSubject = "Mathematics",
}: {
  sources: SourceLite[];
  initialSource?: number | null;
  initialTopic?: string;
  initialSubject?: string;
}) {
  const router = useRouter();
  const [topic, setTopic] = useState(initialTopic);
  const [sourceId, setSourceId] = useState<string>(initialSource ? String(initialSource) : "");
  const [subject, setSubject] = useState<string>(initialSubject);
  const [difficulty, setDifficulty] = useState<string>("mixed");
  const [count, setCount] = useState(6);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          sourceId: sourceId ? Number(sourceId) : undefined,
          count,
          difficulty,
          subject: sourceId ? undefined : subject,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate quiz");
      router.push(`/app/quizzes/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400">
          <Wand2 className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Generate a quiz</h2>
          <p className="text-xs text-slate-400">AI builds exam questions in seconds.</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Topic / focus</span>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Pythagoras, linear equations, probability…"
            className={inputCls}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">From source</span>
          <div className="relative">
            <select
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className={cn(inputCls, "appearance-none pr-9")}
            >
              <option value="">General (no source)</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id} className="bg-[#14141f]">
                  {s.title}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Subject</span>
          <div className="relative">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={Boolean(sourceId)}
              className={cn(inputCls, "appearance-none pr-9", sourceId && "opacity-60")}
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-[#14141f]">
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-400">Difficulty</span>
          <div className="flex gap-1.5">
            {DIFFICULTIES.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={cn(
                  "flex-1 rounded-lg px-2 py-2.5 text-xs capitalize transition",
                  difficulty === d
                    ? "bg-gradient-to-r from-violet-500 to-cyan-500 font-medium text-white"
                    : "bg-white/5 text-slate-300 hover:bg-white/10"
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 text-xs text-slate-400">
          Questions
          <input
            type="range"
            min={3}
            max={10}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="accent-violet-500"
          />
          <span className="w-6 text-center font-semibold text-white">{count}</span>
        </label>
        <button
          onClick={generate}
          disabled={loading}
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {loading ? "Generating…" : "Generate quiz"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/50";
