"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  FileText,
  Sparkles,
  X,
  Loader2,
  BookOpen,
  MessagesSquare,
  StickyNote,
  Search,
  Upload,
  Link as LinkIcon,
  Type,
  Image as ImageIcon,
  CheckCircle2,
  ListChecks,
  Layers,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import { cn, timeAgo } from "@/lib/utils";

type Source = {
  id: number;
  title: string;
  topic: string | null;
  subject: string;
  type: string;
  content: string;
  summary: string | null;
  createdAt: string;
};

const SUBJECT_OPTIONS = [
  "Mathematics",
  "Science",
  "English",
  "History",
  "Geography",
  "Languages",
  "Other",
];

const TYPE_OPTIONS = [
  "Textbook",
  "Practice Test",
  "Notes",
  "Exam Paper",
  "Worksheet",
  "Other",
];

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/50";

export function SourcesClient({ initial }: { initial: Source[] }) {
  const router = useRouter();
  const [sources, setSources] = useState<Source[]>(initial);
  const [showAdd, setShowAdd] = useState(false);
  const [notes, setNotes] = useState<{ id: number; text: string } | null>(null);
  const [generatingId, setGeneratingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");

  function prepend(created: Source) {
    setSources((s) => [created, ...s]);
    setShowAdd(false);
    router.refresh();
  }

  async function removeSource(id: number) {
    setSources((s) => s.filter((x) => x.id !== id));
    await fetch(`/api/sources/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function genNotes(id: number) {
    setGeneratingId(id);
    const res = await fetch("/api/summary", {
      method: "POST",
      body: JSON.stringify({ sourceId: id }),
    });
    setGeneratingId(null);
    if (res.ok) {
      const { notes } = (await res.json()) as { notes: string };
      setNotes({ id, text: notes });
    }
  }

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return sources;
    return sources.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        (s.topic || "").toLowerCase().includes(q) ||
        (s.summary || "").toLowerCase().includes(q)
    );
  }, [sources, query]);

  return (
    <div className="space-y-6 py-2">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-white">Sources</h1>
          <p className="mt-1 text-slate-400">
            Add textbook chapters — paste, upload a PDF/photo, or import a URL. The AI grounds every answer here.
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
        >
          <Plus className="h-4 w-4" /> Add source
        </button>
      </div>

      {/* search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your sources…"
          className={`${inputCls} pl-10`}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="glass flex flex-col items-center justify-center rounded-2xl p-12 text-center">
          <BookOpen className="mb-3 h-10 w-10 text-slate-500" />
          <p className="text-slate-300">{sources.length === 0 ? "No sources yet." : "No matches."}</p>
          <p className="mb-4 text-sm text-slate-500">
            {sources.length === 0
              ? "Add a chapter from your textbook to get started."
              : "Try a different search."}
          </p>
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" /> Add your first source
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {filtered.map((s, i) => (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03 } }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="glass group relative flex flex-col rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20">
                      <FileText className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold leading-tight text-white">{s.title}</h3>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {s.topic && <span className="text-xs text-violet-300">{s.topic}</span>}
                        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">{s.subject}</span>
                        <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] text-slate-300">{s.type}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => removeSource(s.id)}
                    className="text-slate-500 opacity-0 transition hover:text-rose-400 group-hover:opacity-100"
                    aria-label="Delete source"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="mt-3 line-clamp-3 flex-1 text-sm text-slate-400">
                  {s.summary || s.content.slice(0, 160)}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={() => genNotes(s.id)}
                    disabled={generatingId === s.id}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/10 disabled:opacity-60"
                  >
                    {generatingId === s.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <StickyNote className="h-3.5 w-3.5" />
                    )}
                    Notes
                  </button>
                  <Link
                    href={`/app/tutor?source=${s.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                  >
                    <MessagesSquare className="h-3.5 w-3.5" /> Ask
                  </Link>
                  <Link
                    href={`/app/quizzes?source=${s.id}&topic=${encodeURIComponent(s.topic || s.title)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                  >
                    <ListChecks className="h-3.5 w-3.5" /> Quiz
                  </Link>
                  <Link
                    href={`/app/flashcards?source=${s.id}&topic=${encodeURIComponent(s.topic || s.title)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-1.5 text-xs text-slate-200 transition hover:bg-white/10"
                  >
                    <Layers className="h-3.5 w-3.5" /> Cards
                  </Link>
                  <span className="ml-auto self-center text-[11px] text-slate-500">
                    {timeAgo(s.createdAt)}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {showAdd && (
          <AddSourceModal
            onClose={() => setShowAdd(false)}
            onCreated={(s) => prepend(s as Source)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notes && (
          <Modal onClose={() => setNotes(null)} title="AI study notes" wide>
            <Markdown>{notes.text}</Markdown>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Tab = "paste" | "upload" | "url";

function AddSourceModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (s: Source) => void;
}) {
  const [tab, setTab] = useState<Tab>("paste");
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("Mathematics");
  const [sourceType, setSourceType] = useState("Notes");
  const [content, setContent] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const tabs: { id: Tab; label: string; icon: typeof Type }[] = [
    { id: "paste", label: "Paste text", icon: Type },
    { id: "upload", label: "Upload PDF / Photo", icon: Upload },
    { id: "url", label: "From URL", icon: LinkIcon },
  ];

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      let res: Response;
      if (tab === "paste") {
        if (!title.trim() || !content.trim()) throw new Error("Add a title and the content.");
        res = await fetch("/api/sources", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, topic, content, subject, type: sourceType }),
        });
      } else if (tab === "upload") {
        if (!file) throw new Error("Choose a file to upload.");
        const fd = new FormData();
        fd.append("file", file);
        if (title) fd.append("title", title);
        if (topic) fd.append("topic", topic);
        fd.append("subject", subject);
        fd.append("type", sourceType);
        res = await fetch("/api/sources/upload", { method: "POST", body: fd });
      } else {
        if (!url.trim()) throw new Error("Paste a PDF link.");
        res = await fetch("/api/sources/url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, title, topic, subject, type: sourceType }),
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      onCreated(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onClose} title="Add a study source">
      <div className="mb-4 flex gap-1 rounded-xl bg-black/30 p-1">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTab(t.id);
                setError(null);
              }}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition",
                tab === t.id
                  ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          );
        })}
      </div>

      <div className="space-y-4">
        {tab !== "upload" && (
          <Field label="Title">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                tab === "url" ? "e.g. Chapter 6: Trigonometry" : "e.g. Chapter 6: Trigonometry"
              }
              className={inputCls}
            />
          </Field>
        )}
        <Field label="Topic (optional)">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Measurement & Geometry"
            className={inputCls}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Subject">
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={inputCls}
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-[#14141f]">
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Source type">
            <select
              value={sourceType}
              onChange={(e) => setSourceType(e.target.value)}
              className={inputCls}
            >
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t} className="bg-[#14141f]">
                  {t}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {tab === "paste" && (
          <Field label="Content">
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={7}
              placeholder="Paste the chapter text, definitions, worked examples…"
              className={cn(inputCls, "resize-y font-mono text-[13px]")}
            />
          </Field>
        )}

        {tab === "upload" && (
          <Field label="File">
            <p className="text-xs text-slate-500">
              Textbook PDFs up to 200 MB are supported. Large PDFs may take a minute to process.
            </p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center transition hover:border-violet-400/50 hover:bg-white/8"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/20">
                {file ? <CheckCircle2 className="h-5 w-5 text-emerald-400" /> : <Upload className="h-5 w-5 text-white" />}
              </div>
              {file ? (
                <span className="text-sm text-white">{file.name}</span>
              ) : (
                <>
                  <span className="text-sm text-slate-200">Click to choose a file</span>
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <FileText className="h-3 w-3" /> PDF or <ImageIcon className="h-3 w-3" /> photo (vision AI reads scans)
                  </span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,image/*"
              className="hidden"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional — defaults to filename)"
              className={cn(inputCls, "mt-3")}
            />
          </Field>
        )}

        {tab === "url" && (
          <Field label="PDF link">
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/chapter-6.pdf"
              className={inputCls}
            />
          </Field>
        )}

        {error && (
          <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="btn-primary inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {busy ? "Reading & summarising…" : "Add source"}
        </button>
        {tab === "upload" && (
          <p className="text-center text-[11px] text-slate-500">
            PDFs are read as text; photos of pages are read with a free vision model.
          </p>
        )}
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-400">{label}</span>
      {children}
    </label>
  );
}

function Modal({
  children,
  onClose,
  title,
  wide,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
  wide?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "glass-strong max-h-[88vh] w-full overflow-y-auto rounded-2xl p-6",
          wide ? "max-w-3xl" : "max-w-lg"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  );
}
