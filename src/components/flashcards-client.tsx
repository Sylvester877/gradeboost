"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Markdown } from "@/components/markdown";
import {
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RotateCw,
  Shuffle,
  Layers,
  Wand2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Card = { id: number; front: string; back: string };
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

export function FlashcardsClient({
  initial,
  sources,
  initialSource = null,
  initialTopic = "",
  initialSubject = "Mathematics",
}: {
  initial: Card[];
  sources: SourceLite[];
  initialSource?: number | null;
  initialTopic?: string;
  initialSubject?: string;
}) {
  const [cards, setCards] = useState<Card[]>(initial);
  const [order, setOrder] = useState<number[]>(() => initial.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // generator state
  const [topic, setTopic] = useState(initialTopic);
  const [sourceId, setSourceId] = useState<string>(initialSource ? String(initialSource) : "");
  const [subject, setSubject] = useState<string>(initialSubject);
  const [count, setCount] = useState(8);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = cards[order[pos]];

  function next() {
    setFlipped(false);
    setTimeout(() => setPos((p) => (p + 1) % order.length), 120);
  }
  function prev() {
    setFlipped(false);
    setTimeout(() => setPos((p) => (p - 1 + order.length) % order.length), 120);
  }
  function shuffle() {
    setFlipped(false);
    setOrder((o) => [...o].sort(() => Math.random() - 0.5));
    setPos(0);
  }

  async function reload() {
    const res = await fetch("/api/flashcards");
    if (res.ok) {
      const data = (await res.json()) as Card[];
      setCards(data);
      setOrder(data.map((_, i) => i));
      setPos(0);
      setFlipped(false);
    }
  }

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/flashcards/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          sourceId: sourceId ? Number(sourceId) : undefined,
          count,
          subject: sourceId ? undefined : subject,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      await reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Flashcards</h1>
        <p className="mt-1 text-slate-400">Generate revision cards and flip to self-test.</p>
      </div>

      {/* generator */}
      <div className="glass rounded-2xl p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-400">
            <Wand2 className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="font-display text-lg font-semibold text-white">Make flashcards</h2>
            <p className="text-xs text-slate-400">AI pulls the key definitions & formulae.</p>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">Topic</span>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. Index laws"
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
                <option value="">General</option>
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
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-400">
            Cards
            <input
              type="range"
              min={4}
              max={12}
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="accent-pink-500"
            />
            <span className="w-6 text-center font-semibold text-white">{count}</span>
          </label>
          <button
            onClick={generate}
            disabled={generating}
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {generating ? "Making…" : "Generate cards"}
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
        )}
      </div>

      {/* deck */}
      {cards.length === 0 ? (
        <div className="glass flex flex-col items-center rounded-2xl p-12 text-center">
          <Layers className="mb-3 h-10 w-10 text-slate-500" />
          <p className="text-slate-300">No flashcards yet.</p>
          <p className="text-sm text-slate-500">Generate a set above to start revising.</p>
        </div>
      ) : (
        <div className="mx-auto max-w-xl">
          <div className="mb-3 flex items-center justify-between text-sm text-slate-400">
            <span>
              Card {pos + 1} of {order.length}
            </span>
            <button
              onClick={shuffle}
              className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-white/10"
            >
              <Shuffle className="h-3.5 w-3.5" /> Shuffle
            </button>
          </div>

          <div style={{ perspective: "1400px" }} className="select-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={order[pos]}
                initial={{ opacity: 0, scale: 0.92, y: 12 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -12 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="relative min-h-[18rem] cursor-pointer"
                onClick={() => setFlipped((f) => !f)}
              >
                <motion.div
                  className="relative h-full w-full"
                  style={{ transformStyle: "preserve-3d" }}
                  animate={{ rotateY: flipped ? 180 : 0 }}
                  transition={{ duration: 0.55, ease: [0.4, 0.2, 0.2, 1] }}
                >
                  {/* front */}
                  <div
                    className="glass-strong gradient-border absolute inset-0 flex min-h-[18rem] flex-col items-center justify-center rounded-3xl p-8 text-center"
                    style={{ backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" }}
                  >
                    <span className="mb-3 rounded-full bg-violet-500/20 px-2.5 py-1 text-[11px] font-medium text-violet-200">
                      Question
                    </span>
                    <p className="font-display text-xl font-semibold text-white">{current?.front}</p>
                    <p className="mt-6 text-xs text-slate-500">Tap to flip ↻</p>
                  </div>
                  {/* back */}
                  <div
                    className="glass-strong absolute inset-0 flex min-h-[18rem] flex-col items-center justify-center rounded-3xl border border-cyan-400/20 p-8 text-center"
                    style={{
                      backfaceVisibility: "hidden",
                      WebkitBackfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    <span className="mb-3 rounded-full bg-cyan-500/20 px-2.5 py-1 text-[11px] font-medium text-cyan-200">
                      Answer
                    </span>
                    <div className="prose-tight max-h-56 overflow-y-auto text-base text-slate-100">
                      {current && <Markdown>{current.back}</Markdown>}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              onClick={prev}
              className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-white transition hover:bg-white/10"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={() => setFlipped((f) => !f)}
              className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm text-white transition hover:bg-white/10"
            >
              <RotateCw className="h-4 w-4" /> Flip
            </button>
            <button
              onClick={next}
              className="grid h-11 w-11 place-items-center rounded-xl bg-white/5 text-white transition hover:bg-white/10"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/50";
