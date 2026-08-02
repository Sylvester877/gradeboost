"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  BookOpen,
  ChevronRight,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import { TEXTBOOK_CHAPTERS } from "@/lib/chapters";
import { cn } from "@/lib/utils";

type Tab = "browse" | "search";

export default function TextbookPage() {
  const [tab, setTab] = useState<Tab>("browse");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: number; text: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedChapter, setExpandedChapter] = useState<number | null>(null);
  const [searched, setSearched] = useState(false);

  const doSearch = useCallback(async (q?: string) => {
    const searchQuery = (q ?? query).trim();
    if (!searchQuery) return;
    setQuery(searchQuery);
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/textbook/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data.chunks || []);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const search = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    doSearch();
  }, [doSearch]);

  function searchChapter(chapterTitle: string) {
    setTab("search");
    // Use the title directly — doSearch will setQuery inside
    doSearch(chapterTitle);
  }

  return (
    <div className="space-y-6 py-2">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Textbook</h1>
        <p className="mt-1 text-slate-400">
          Essential Mathematics for the Australian Curriculum &mdash; Year 10, 4th Edition
        </p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 rounded-xl bg-black/30 p-1 w-fit">
        <button
          onClick={() => setTab("browse")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            tab === "browse"
              ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25"
              : "text-slate-400 hover:text-white"
          )}
        >
          <BookOpen className="h-4 w-4" /> Browse chapters
        </button>
        <button
          onClick={() => setTab("search")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all",
            tab === "search"
              ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white shadow-lg shadow-violet-500/25"
              : "text-slate-400 hover:text-white"
          )}
        >
          <Search className="h-4 w-4" /> Search
        </button>
      </div>

      <AnimatePresence mode="wait">
        {tab === "browse" ? (
          <motion.div
            key="browse"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Chapter grid */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TEXTBOOK_CHAPTERS.map((ch, i) => {
                const Icon = ch.icon;
                const isExpanded = expandedChapter === ch.num;
                return (
                  <motion.div
                    key={ch.num}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <div className="glass group relative w-full overflow-hidden rounded-2xl text-left transition-all hover:bg-white/8 hover:scale-[1.01]">
                      <button
                        onClick={() => setExpandedChapter(isExpanded ? null : ch.num)}
                        className="w-full p-5"
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
                            <h3 className="mt-0.5 text-sm font-semibold text-white leading-snug">
                              {ch.title}
                            </h3>
                            <div className="mt-2 flex items-center gap-1 text-xs text-violet-300">
                              <span>{ch.subsections.length} sections</span>
                              <ChevronRight className={cn(
                                "h-3.5 w-3.5 transition-transform",
                                isExpanded && "rotate-90"
                              )} />
                            </div>
                          </div>
                        </div>
                      </button>

                      {/* Expanded subsections */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="mx-5 mb-4 border-t border-white/10 pt-3">
                              <ul className="space-y-1">
                                {ch.subsections.map((section, si) => (
                                  <li key={si}>
                                    <button
                                      onClick={() => searchChapter(`${section} chapter ${ch.num}`)}
                                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-300 transition hover:bg-white/8 hover:text-white"
                                    >
                                      <Search className="h-3 w-3 shrink-0 text-violet-400" />
                                      <span className="line-clamp-1">{section}</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                              <div className="mt-3 flex flex-wrap gap-1.5">
                                <button
                                  onClick={() => searchChapter(`Chapter ${ch.num} ${ch.title}`)}
                                  className="inline-flex items-center gap-1 rounded-md bg-violet-500/15 px-2.5 py-1.5 text-[11px] text-violet-200 transition hover:bg-violet-500/25"
                                >
                                  <Search className="h-3 w-3" /> Search entire chapter
                                </button>
                                <a
                                  href={`/app/tutor?subject=Mathematics&topic=Chapter ${ch.num}: ${ch.title}`}
                                  className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2.5 py-1.5 text-[11px] text-cyan-200 transition hover:bg-cyan-500/25"
                                >
                                  <Sparkles className="h-3 w-3" /> Ask AI tutor
                                </a>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Quick search hint */}
            <div className="glass rounded-2xl p-5 text-center">
              <p className="text-sm text-slate-400">
                Looking for something specific?
              </p>
              <button
                onClick={() => setTab("search")}
                className="btn-primary mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
              >
                <Search className="h-4 w-4" /> Search the textbook
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="search"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-4"
          >
            {/* Search form */}
            <form onSubmit={search} className="relative">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search a topic, formula, or exercise..."
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-5 py-3.5 pl-12 text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/50 text-sm"
              />
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
              <button
                type="submit"
                disabled={loading}
                className="btn-primary absolute right-2 top-1/2 -translate-y-1/2 rounded-xl px-4 py-1.5 text-sm"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
              </button>
            </form>

            {/* Results */}
            {loading && (
              <div className="glass rounded-2xl p-10 text-center">
                <div className="flex items-center justify-center gap-1.5 text-slate-400">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-pink-400" />
                </div>
                <p className="mt-3 text-sm text-slate-500">Searching textbook...</p>
              </div>
            )}

            {!loading && searched && results.length === 0 && (
              <div className="glass rounded-2xl p-10 text-center">
                <BookOpen className="mx-auto mb-3 h-10 w-10 text-slate-500" />
                <p className="text-slate-300">No results found for &ldquo;{query}&rdquo;</p>
                <p className="text-sm text-slate-500">Try different keywords or browse by chapter.</p>
                <button
                  onClick={() => { setTab("browse"); setSearched(false); }}
                  className="btn-primary mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
                >
                  <BookOpen className="h-4 w-4" /> Browse chapters instead
                </button>
              </div>
            )}

            {!searched && !loading && (
              <div className="glass rounded-2xl p-10 text-center">
                <Search className="mx-auto mb-3 h-10 w-10 text-slate-500" />
                <p className="text-slate-300">Enter a topic above to search the textbook</p>
                <p className="text-sm text-slate-500">
                  Try: Pythagoras, quadratic formula, probability, trigonometry...
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  {["Pythagoras theorem", "quadratic formula", "trigonometry ratios", "probability tree diagrams", "compound interest"].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => doSearch(suggestion)}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-slate-300 transition hover:bg-white/10 hover:text-white hover:border-violet-400/40"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm text-slate-400">
                  Found {results.length} {results.length === 1 ? "result" : "results"} for &ldquo;{query}&rdquo;
                </p>
                {results.map((r, i) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="glass group rounded-2xl p-5 transition-all hover:bg-white/8"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-violet-300">
                        Excerpt #{r.id}
                      </p>
                      <a
                        href={`/app/tutor?subject=Mathematics&topic=${encodeURIComponent(query)}`}
                        className="inline-flex items-center gap-1 rounded-md bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-300 opacity-0 transition group-hover:opacity-100 hover:bg-cyan-500/20"
                      >
                        <Sparkles className="h-3 w-3" /> Ask AI about this
                      </a>
                    </div>
                    <div className="prose-tight text-sm text-slate-200">
                      <Markdown>{r.text}</Markdown>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
