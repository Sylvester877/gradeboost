"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  X,
  ChevronRight,
  RotateCcw,
  ArrowLeft,
  Trophy,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { ProgressRing } from "@/components/ui";
import { Markdown } from "@/components/markdown";
import { cn, toGrade } from "@/lib/utils";

export type Q = {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
};

export function QuizPlayer({
  quizId,
  title,
  topic,
  questions,
}: {
  quizId: number;
  title: string;
  topic: string | null;
  questions: Q[];
}) {
  const router = useRouter();
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<(number | null)[]>(
    () => questions.map(() => null)
  );
  const [phase, setPhase] = useState<"play" | "review">("play");
  const [submitting, setSubmitting] = useState(false);
  const [score, setScore] = useState(0);

  const q = questions[idx];
  const total = questions.length;
  const answeredCount = answers.filter((a) => a !== null).length;
  const allAnswered = answeredCount === total;

  const scorePct = useMemo(
    () => (total ? Math.round((score / total) * 100) : 0),
    [score, total]
  );

  async function submit() {
    setSubmitting(true);
    let s = 0;
    questions.forEach((qq, i) => {
      if (answers[i] === qq.answer) s++;
    });
    setScore(s);
    const responses = answers.map((selected, questionIndex) => ({
      questionIndex,
      selected: selected ?? -1,
    }));
    try {
      await fetch(`/api/quiz/${quizId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score: s, total, responses }),
      });
    } catch {
      // best-effort logging
    }
    setSubmitting(false);
    setPhase("review");
  }

  if (phase === "review") {
    return (
      <div className="space-y-6 py-2">
        <div className="glass flex flex-col items-center rounded-2xl p-8 text-center">
          <Trophy className="mb-3 h-10 w-10 text-amber-300" />
          <h1 className="font-display text-2xl font-bold text-white">
            {scorePct >= 70 ? "Great job! 🎉" : scorePct >= 50 ? "Good effort!" : "Keep practising 💪"}
          </h1>
          <p className="text-sm text-slate-400">{title}</p>
          <div className="my-6">
            <ProgressRing
              value={scorePct}
              size={150}
              label={`${score}/${total}`}
              sublabel={`Grade ${toGrade(scorePct)}`}
            />
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={() => {
                setAnswers(questions.map(() => null));
                setIdx(0);
                setPhase("play");
              }}
              className="glass inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-white hover:bg-white/10"
            >
              <RotateCcw className="h-4 w-4" /> Retry
            </button>
            <Link
              href="/app/quizzes"
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
            >
              <ArrowLeft className="h-4 w-4" /> All quizzes
            </Link>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            +{score * 5} XP earned · mastery updated
          </p>
        </div>

        {/* per-question review */}
        <div className="space-y-3">
          <h2 className="font-display text-lg font-semibold text-white">Review answers</h2>
          {questions.map((qq, i) => {
            const sel = answers[i];
            const correct = sel === qq.answer;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.04 } }}
                whileHover={{ scale: 1.006, transition: { duration: 0.2 } }}
                className="glass rounded-2xl p-5"
              >
                <div className="mb-3 flex items-start gap-2">
                  {correct ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
                  )}
                  <p className="font-medium text-white">
                    {i + 1}. {qq.question}
                  </p>
                </div>
                <div className="space-y-1.5">
                  {qq.options.map((opt, oi) => {
                    const isAnswer = oi === qq.answer;
                    const isPicked = oi === sel;
                    return (
                      <div
                        key={oi}
                        className={cn(
                          "rounded-lg border px-3 py-2 text-sm",
                          isAnswer
                            ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                            : isPicked
                            ? "border-rose-400/40 bg-rose-500/10 text-rose-200"
                            : "border-white/8 text-slate-300"
                        )}
                      >
                        {opt}
                        {isAnswer && <span className="ml-2 text-xs">(correct)</span>}
                        {isPicked && !isAnswer && <span className="ml-2 text-xs">(your pick)</span>}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 rounded-lg bg-white/5 p-3 text-sm text-slate-300">
                  <span className="font-medium text-violet-300">Why: </span>
                  {qq.explanation}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-2">
      <button
        onClick={() => router.push("/app/quizzes")}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to quizzes
      </button>

      {/* progress */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-white">{title}</span>
          <span className="text-slate-400">
            {idx + 1} / {total}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-white/8">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400"
            animate={{ width: `${((idx + 1) / total) * 100}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={idx}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
          className="glass rounded-2xl p-6"
        >
          <p className="mb-5 text-lg font-medium text-white">{q.question}</p>
          <div className="space-y-2.5">
            {q.options.map((opt, oi) => {
              const selected = answers[idx] === oi;
              return (
                <motion.button
                  key={oi}
                  onClick={() =>
                    setAnswers((a) => {
                      const n = [...a];
                      n[idx] = oi;
                      return n;
                    })
                  }
                  whileHover={{ scale: 1.012 }}
                  whileTap={{ scale: 0.985 }}
                  animate={selected ? { scale: [1, 1.02, 1] } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 22 }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-colors",
                    selected
                      ? "border-violet-400/60 bg-violet-500/15 text-white shadow-lg shadow-violet-500/10"
                      : "border-white/8 bg-white/5 text-slate-200 hover:border-white/20 hover:bg-white/8"
                  )}
                >
                  <motion.span
                    animate={selected ? { scale: [1, 1.25, 1] } : { scale: 1 }}
                    transition={{ duration: 0.35 }}
                    className={cn(
                      "grid h-6 w-6 shrink-0 place-items-center rounded-full border text-xs font-semibold",
                      selected
                        ? "border-violet-400 bg-violet-500 text-white"
                        : "border-white/20 text-slate-400"
                    )}
                  >
                    {String.fromCharCode(65 + oi)}
                  </motion.span>
                  <span>{opt}</span>
                  {selected && (
                    <motion.span
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 500, damping: 18 }}
                      className="ml-auto"
                    >
                      <Check className="h-4 w-4 text-violet-300" />
                    </motion.span>
                  )}
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="mt-5 flex items-center justify-between">
        <button
          onClick={() => setIdx((i) => Math.max(0, i - 1))}
          disabled={idx === 0}
          className="rounded-xl px-4 py-2.5 text-sm text-slate-300 transition hover:text-white disabled:opacity-40"
        >
          Previous
        </button>

        {idx < total - 1 ? (
          <button
            onClick={() => setIdx((i) => Math.min(total - 1, i + 1))}
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm"
          >
            Next <ChevronRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={!allAnswered || submitting}
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            {submitting ? "Marking…" : "Submit answers"}
          </button>
        )}
      </div>
      {!allAnswered && idx === total - 1 && (
        <p className="mt-2 text-center text-xs text-amber-300">
          Answer all questions before submitting.
        </p>
      )}
      {topic && (
        <p className="mt-3 text-center text-xs text-slate-500">Topic: {topic}</p>
      )}
    </div>
  );
}
