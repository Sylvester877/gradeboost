"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  Sparkles,
  GraduationCap,
  User,
  ChevronDown,
  Camera,
  X,
  Paperclip,
  FileText,
  Plus,
  MessageSquare,
  History,
  Trash2,
  Square,
  Check,
  Copy,
  BookOpen,
} from "lucide-react";
import { Markdown } from "@/components/markdown";
import { cn } from "@/lib/utils";

function isImageFile(file: File) {
  return (
    file.type.startsWith("image/") ||
    /\.(jpe?g|png|webp|gif|bmp)$/i.test(file.name)
  );
}

function compressImageFile(
  file: File,
  maxWidth = 1280,
  maxHeight = 1280,
  quality = 0.85
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round(height * (maxWidth / width));
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round(width * (maxHeight / height));
          height = maxHeight;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas not supported"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = (err) => reject(err);
      img.src = reader.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

type Msg = {
  role: "user" | "assistant";
  content: string;
  image?: string;
  suggestions?: string[];
  sources?: string[];
};
type SourceLite = { id: number; title: string; topic: string | null; subject: string };
type SessionLite = { id: number; title: string; sourceId: number | null; subject: string | null };

/** Parse [SUGGESTIONS] block out of AI response. Returns { clean, suggestions }. */
function extractSuggestions(text: string): { clean: string; suggestions: string[] } {
  const re = /\[SUGGESTIONS\]\r?\n([\s\S]*?)\[\/SUGGESTIONS\]/i;
  const match = re.exec(text);
  if (!match) return { clean: text, suggestions: [] };
  const suggestions = match[1]
    .split("\n")
    .map((s) => s.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);
  return {
    clean: (text.slice(0, match.index) + text.slice(match.index + match[0].length)).trim(),
    suggestions,
  };
}

/**
 * Typewriter markdown — reveals `text` word-by-word (like ChatGPT typing)
 * instead of appearing all at once. A partial/complete [SUGGESTIONS] block is
 * stripped so it never types out on screen. The ticker idles when caught up
 * and wakes on the next chunk, so slow streams keep filling in; unmounting
 * (when the message is no longer the live one) cleans everything up. Used only
 * for the live assistant bubble (keyed per stream so history stays instant).
 */
function StreamingMarkdown({ text }: { text: string }) {
  // Drop everything from the (possibly partial) [SUGGESTIONS] block onwards so
  // it never types out on screen.
  const display = useMemo(() => text.split(/\[\s*SUGGESTIONS\s*\]/i)[0].trim(), [text]);
  // Tokenize as "word + trailing whitespace" so rejoining is byte-identical to
  // the source up to the revealed point — newlines, markdown and $$LaTeX$$
  // structure stay intact while the reveal is still word-by-word.
  const words = useMemo(() => display.match(/\S+\s*/g) || [], [display]);
  const [shown, setShown] = useState(0); // number of tokens revealed
  const shownRef = useRef(0);
  const wordsRef = useRef(words);

  // Keep the words ref in sync with the latest chunk (after render, so the
  // ticker always sees fresh text without needing to restart or re-schedule).
  useEffect(() => {
    wordsRef.current = words;
  });

  useEffect(() => {
    // Fresh stream (new mount via key={streamKey}) restarts the reveal at 0.
    shownRef.current = 0;
    let raf = 0;
    let idle: ReturnType<typeof setTimeout> | undefined;
    let last = 0;
    const stop = () => {
      cancelAnimationFrame(raf);
      if (idle) clearTimeout(idle);
    };
    const tick = (now: number) => {
      const target = wordsRef.current.length;
      if (shownRef.current >= target) {
        // Caught up — idle-check shortly in case a new chunk lands.
        idle = setTimeout(() => {
          idle = undefined;
          raf = requestAnimationFrame(tick);
        }, 150);
        return;
      }
      if (last) {
        // ~55 words/sec — brisk reading pace; keeps up with typical streams.
        const step = Math.max(1, Math.round(((now - last) / 1000) * 55));
        shownRef.current = Math.min(target, shownRef.current + step);
        setShown(shownRef.current);
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return stop;
  }, []);

  const revealing = shown < words.length;
  return (
    <div className="min-w-0">
      <Markdown>{words.slice(0, shown).join("")}</Markdown>
      {revealing && (
        <span className="ml-0.5 inline-block h-4 w-[2px] translate-y-0.5 animate-pulse rounded-sm bg-violet-400" />
      )}
    </div>
  );
}

const SUGGESTIONS = [
  "Explain Pythagoras' theorem with a worked example",
  "How do I find the gradient of a line from two points?",
  "Quiz me on simplifying surds",
  "What's the difference between sin, cos and tan?",
];

const HISTORY_OPEN_KEY = "gradeboost-chat-sidebar-open";

function loadSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(HISTORY_OPEN_KEY);
    return v !== null ? v === "1" : true; // default open on first visit
  } catch {
    return true;
  }
}

function saveSidebarOpen(open: boolean) {
  try {
    localStorage.setItem(HISTORY_OPEN_KEY, open ? "1" : "0");
  } catch {
    // ignore
  }
}

const SUBJECT_OPTIONS = [
  "Mathematics",
  "Science",
  "English",
  "History",
  "Geography",
  "Languages",
  "Other",
];

export function TutorClient({
  sessions,
  currentSessionId,
  initialMessages,
  sources,
  initialSourceId,
  initialSubject,
}: {
  sessions: SessionLite[];
  currentSessionId: number | null;
  initialMessages: Msg[];
  sources: SourceLite[];
  initialSourceId: number | null;
  initialSubject: string | null;
}) {
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [sourceId, setSourceId] = useState<number | "all" | null>(initialSourceId ?? "all");
  const [subject, setSubject] = useState<string>(initialSubject || "Mathematics");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingImageName, setPendingImageName] = useState<string | null>(null);
  const [dragDepth, setDragDepth] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [localSources, setLocalSources] = useState<SourceLite[]>(sources);
  const [sessionList, setSessionList] = useState<SessionLite[]>(sessions);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(currentSessionId);
  const [showHistory, setShowHistory] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(loadSidebarOpen);
  const [copiedMsg, setCopiedMsg] = useState<number | null>(null);
  const [streamKey, setStreamKey] = useState(0);
  const router = useRouter();
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    try {
      const compressed = await compressImageFile(f);
      setPendingImage(compressed);
      setPendingImageName("Camera photo");
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: "Couldn't prepare that photo. Try a smaller image.",
        },
      ]);
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    e.target.value = "";
    // Images attach to the chat (preview + ask, like ChatGPT/Gemini).
    if (isImageFile(f)) {
      attachImageFile(f);
      return;
    }
    // Non-image files (PDFs, etc.) still upload as a study source.
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", f);
      form.append("title", f.name.replace(/\.[^.]+$/, ""));
      form.append("subject", subject);
      form.append("type", "Notes");
      const res = await fetch("/api/sources/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      const newSource: SourceLite = {
        id: data.id,
        title: data.title,
        topic: data.topic ?? null,
        subject: data.subject ?? "Mathematics",
      };
      setLocalSources((prev) => [newSource, ...prev]);
      setSourceId(data.id);
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: `✅ Added “${data.title}” as a study source — the tutor can now pull from it.`,
        },
      ]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setMessages((m) => [...m, { role: "assistant", content: `Upload failed: ${msg}` }]);
    } finally {
      setUploading(false);
    }
  }

  function attachImageFile(f: File) {
    if (!isImageFile(f)) return;
    compressImageFile(f)
      .then((compressed) => {
        setPendingImage(compressed);
        setPendingImageName(f.name);
      })
      .catch(() => {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: "Couldn't prepare that photo. Try a smaller image.",
          },
        ]);
      });
  }

  function onDropImage(e: React.DragEvent) {
    e.preventDefault();
    setDragDepth(0);
    const f = e.dataTransfer.files?.[0];
    if (f) attachImageFile(f);
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  function autosize() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }

  function copyMessage(i: number, text: string) {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedMsg(i);
    setTimeout(() => setCopiedMsg((c) => (c === i ? null : c)), 1600);
  }

  function startNewChat() {
    const tempId = -Date.now();
    const currentSubject = subject || "Mathematics";
    setMessages([]);
    setActiveSessionId(tempId);
    setInput("");
    setPendingImage(null);
    setPendingImageName(null);
    setSourceId("all");
    setShowHistory(false);
    setSessionList((prev) => [
      { id: tempId, title: "New chat", sourceId: null, subject: currentSubject },
      ...prev.filter((s) => s.id > 0),
    ]);
    router.push("/app/tutor");
  }

  function openSession(id: number) {
    setShowHistory(false);
    router.push(`/app/tutor?session=${id}`);
  }

  async function deleteSession(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await fetch(`/api/chat/${id}`, { method: "DELETE" });
    } catch {
      // ignore network errors — still remove locally
    }
    setSessionList((prev) => prev.filter((s) => s.id !== id));
    // If the deleted session is currently active, go to a new chat.
    if (activeSessionId === id) {
      setMessages([]);
      setActiveSessionId(null);
      router.push("/app/tutor");
    }
  }

  async function send(text: string) {
    const question = text.trim();
    const image = pendingImage;
    if ((!question && !image) || streaming) return;
    setInput("");
    setPendingImage(null);
    setPendingImageName(null);
    if (taRef.current) taRef.current.style.height = "auto";

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [
      ...m,
      { role: "user", content: question || "Solve this problem from my textbook.", image: image || undefined },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);
    setStreamKey((k) => k + 1); // fresh typewriter for this stream

    const controller = new AbortController();
    abortRef.current = controller;
    let usedSources: string[] = [];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          history,
          sourceId,
          image,
          sessionId: activeSessionId,
          subject,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }
      if (!res.body) throw new Error("no body");

      const returnedSessionId = res.headers.get("X-Session-Id");
      const usedSourcesHeader = res.headers.get("X-Sources-Used");
      if (usedSourcesHeader) {
        try {
          const parsed = JSON.parse(usedSourcesHeader) as { available?: string[]; used?: string[] };
          usedSources = parsed.used ?? [];
        } catch {
          usedSources = [];
        }
      }
      if (returnedSessionId) {
        const idNum = Number(returnedSessionId);
        if (Number.isFinite(idNum) && idNum > 0 && idNum !== activeSessionId) {
          setActiveSessionId(idNum);
          setSessionList((prev) => {
            const cleaned = prev.filter((s) => s.id > 0);
            if (prev.some((s) => s.id === idNum)) return cleaned;
            return [{ id: idNum, title: question || "New chat", sourceId: typeof sourceId === "number" ? sourceId : null, subject }, ...cleaned];
          });
          // Do NOT navigate: the tutor page mounts TutorClient with
          // key={sessionId}, so a router.replace here would remount the whole
          // component mid-stream, killing the stream and blanking the chat.
          // The session is already in the sidebar list, so the URL stays clean.
        }
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      const accRef = { current: "" };
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accRef.current += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = { role: "assistant", content: accRef.current };
          return next;
        });
      }
      if (!accRef.current.trim()) {
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = {
            role: "assistant",
            content: "I couldn't generate a response. Please check your API key in Settings.",
          };
          return next;
        });
      } else {
        // Extract clickable suggestions from the AI response
        const { clean, suggestions } = extractSuggestions(accRef.current);
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = {
            role: "assistant",
            content: clean,
            suggestions,
            sources: usedSources.length > 0 ? usedSources : undefined,
          };
          return next;
        });
      }

    } catch (err) {
      // If the user stopped generation, keep whatever text we already have.
      if (err instanceof DOMException && err.name === "AbortError") {
        // No error message — user intentionally stopped. Still attach source badges
        // so they can see what the answer was drawing from.
        if (usedSources.length > 0) {
          setMessages((m) => {
            const next = [...m];
            const last = next[next.length - 1];
            if (last && last.role === "assistant" && last.content) {
              next[next.length - 1] = { ...last, sources: usedSources };
            }
            return next;
          });
        }
      } else {
        setMessages((m) => {
          const next = [...m];
          next[next.length - 1] = {
            role: "assistant",
            content: "Connection error. Please try again.",
          };
          return next;
        });
      }
      // drop the optimistic "New chat" if the first message failed
      setSessionList((prev) => prev.filter((s) => s.id > 0));
      if (activeSessionId && activeSessionId < 0) setActiveSessionId(null);
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }

  function stopStreaming() {
    abortRef.current?.abort();
  }

  const empty = messages.length === 0;

  const isSolvingPhoto =
    streaming &&
    messages.length >= 2 &&
    messages[messages.length - 1].role === "assistant" &&
    messages[messages.length - 1].content === "" &&
    Boolean(messages[messages.length - 2].image);

  function renderSessionList() {
    const persisted = sessionList.filter((s) => s.id > 0);
    if (persisted.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <MessageSquare className="h-6 w-6 text-slate-500" />
          <p className="text-xs text-slate-500">No chats yet.</p>
          <button
            onClick={startNewChat}
            className="inline-flex items-center gap-1 rounded-lg bg-violet-500/20 px-3 py-1.5 text-xs font-medium text-violet-200 transition hover:bg-violet-500/30"
          >
            <Plus className="h-3.5 w-3.5" /> Start your first chat
          </button>
        </div>
      );
    }
    return (
      <div className="space-y-1.5 overflow-y-auto pr-1">
        {persisted.map((s) => (
          <button
            key={s.id}
            onClick={() => openSession(s.id)}
            className={cn(
              "group flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-sm transition-all",
              activeSessionId === s.id
                ? "bg-violet-500/15 text-white ring-1 ring-violet-400/30"
                : "text-slate-300 hover:bg-white/8"
            )}
          >
            <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
            <span className="line-clamp-2 flex-1 text-[13px] leading-snug">
              {s.title || "Untitled chat"}
            </span>
            <button
              onClick={(e) => deleteSession(s.id, e)}
              className="ml-auto shrink-0 rounded-md p-1 text-slate-600 opacity-0 transition hover:bg-red-500/20 hover:text-red-400 group-hover:opacity-100"
              aria-label="Delete chat"
              title="Delete chat"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-4 py-2 lg:h-[calc(100vh-5rem)]">
      {/* session sidebar */}
      {historyOpen ? (
        <aside className="hidden h-full w-64 flex-col gap-3 md:flex">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-slate-300">Recent chats</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={startNewChat}
                className="inline-flex items-center gap-1 rounded-lg bg-violet-500/20 px-2 py-1 text-xs font-medium text-violet-200 transition hover:bg-violet-500/30"
              >
                <Plus className="h-3.5 w-3.5" /> New
              </button>
              <button
                onClick={() => { setHistoryOpen(false); saveSidebarOpen(false); }}
                className="grid h-7 w-7 place-items-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Hide chat history"
                title="Hide chat history"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="flex-1 min-h-0">
            {renderSessionList()}
          </div>
        </aside>
      ) : (
        <button
          onClick={() => { setHistoryOpen(true); saveSidebarOpen(true); }}
          className="hidden h-10 w-10 shrink-0 items-center justify-center self-start rounded-xl border border-white/10 bg-white/5 text-slate-400 transition hover:bg-white/8 hover:text-white md:flex"
          aria-label="Show chat history"
          title="Show chat history"
        >
          <History className="h-5 w-5" />
        </button>
      )}

      {/* chat area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-white">AI Tutor</h1>
            <p className="text-sm text-slate-400">Step-by-step help, grounded in your textbook.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <select
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                setSourceId("all");
              }}
              className="appearance-none rounded-xl border border-white/10 bg-white/5 py-2.5 pl-3.5 pr-9 text-sm text-white outline-none transition focus:border-violet-400/50"
            >
              {SUBJECT_OPTIONS.map((s) => (
                <option key={s} value={s} className="bg-[#14141f]">
                  {s}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          {(subject === "Mathematics" ||
            localSources.some((s) => s.subject === subject)) && (
            <div className="relative">
              <select
                value={sourceId ?? "all"}
                onChange={(e) => {
                  const v = e.target.value;
                  setSourceId(v === "all" ? "all" : Number(v));
                }}
                className="appearance-none rounded-xl border border-white/10 bg-white/5 py-2.5 pl-3.5 pr-9 text-sm text-white outline-none transition focus:border-violet-400/50"
              >
                {subject === "Mathematics" && (
                  <option value="all" className="bg-[#14141f]">
                    📚 All my sources + textbook
                  </option>
                )}
                {subject !== "Mathematics" && (
                  <option value="all" className="bg-[#14141f]">
                    📚 All my {subject.toLowerCase()} sources
                  </option>
                )}
                {localSources
                  .filter((s) => s.subject === subject)
                  .map((s) => (
                    <option key={s.id} value={s.id} className="bg-[#14141f]">
                      {s.title}
                    </option>
                  ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          )}
        </div>
        </div>

        {/* mobile new chat / history */}
        <div className="mb-3 flex gap-2 md:hidden">
          <button
            onClick={startNewChat}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/5 py-2 text-sm text-slate-300 transition hover:bg-white/8"
          >
            <Plus className="h-4 w-4" /> New chat
          </button>
          <button
            onClick={() => setShowHistory((v) => !v)}
            className={cn(
              "inline-flex items-center justify-center gap-1 rounded-xl border px-3 py-2 text-sm transition",
              showHistory
                ? "border-violet-400/40 bg-violet-500/10 text-white"
                : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/8"
            )}
            aria-label="Toggle history"
          >
            <History className="h-4 w-4" /> History
          </button>
        </div>

        {/* mobile history panel */}
        {showHistory && (
          <div className="mb-3 flex max-h-[50vh] flex-col rounded-xl border border-white/10 bg-white/5 p-3 md:hidden">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-slate-300">Recent chats</h3>
              <button onClick={() => setShowHistory(false)} className="text-slate-400 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 min-h-0">
              {renderSessionList()}
            </div>
          </div>
        )}

        {/* messages */}
        <div
          ref={scrollRef}
          onDragEnter={(e) => {
            e.preventDefault();
            setDragDepth((d) => d + 1);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            // Pointer left the window entirely -> hard reset so a cancelled
            // drag (Escape / dragging out) can't leave the overlay stuck.
            if (e.relatedTarget === null) {
              setDragDepth(0);
            } else {
              setDragDepth((d) => Math.max(0, d - 1));
            }
          }}
          onDrop={onDropImage}
          className="relative flex-1 space-y-5 overflow-y-auto rounded-2xl p-1 pr-2"
        >
          {/* drag-to-attach overlay */}
          {dragDepth > 0 && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-2xl border-2 border-dashed border-violet-400/60 bg-violet-500/10 backdrop-blur-[2px]">
              <p className="rounded-full bg-black/70 px-4 py-2 text-sm font-medium text-white shadow-lg">
                Drop photo to attach 📷
              </p>
            </div>
          )}
          {empty && (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mb-5 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-400 shadow-xl shadow-violet-500/30"
              >
                <GraduationCap className="h-8 w-8 text-white" />
              </motion.div>
              <h2 className="font-display text-2xl font-semibold text-white">
                Ask me anything about maths
              </h2>
              <p className="mt-2 max-w-md text-sm text-slate-400">
                I&apos;ll explain concepts, walk through worked solutions and build your confidence for
                the exam.
              </p>
              {localSources.filter((s) => s.subject === subject).length > 0 ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-xs text-violet-200">
                  <Sparkles className="h-3 w-3" />
                  I can see {localSources.filter((s) => s.subject === subject).length} uploaded{" "}
                  {subject.toLowerCase()} source{localSources.filter((s) => s.subject === subject).length > 1 ? "s" : ""}
                  {subject === "Mathematics" ? " + your textbook" : ""} — ask me anything about them.
                </p>
              ) : subject === "Mathematics" ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-400">
                  <BookOpen className="h-3 w-3" /> Searching your textbook for every answer.
                </p>
              ) : null}
              <div className="mt-6 grid w-full max-w-xl gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s, i) => (
                  <motion.button
                    key={s}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.06 } }
                    }
                    onClick={() => send(s)}
                    className="glass rounded-xl px-4 py-3 text-left text-sm text-slate-200 transition hover:bg-white/8"
                  >
                    {s}
                    </motion.button>
                ))}
              </div>
            </div>
          )}

          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 14, x: m.role === "user" ? 16 : -16 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className={cn("flex gap-3", m.role === "user" && "flex-row-reverse")}
              >
                <div
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                    m.role === "user"
                      ? "bg-white/8"
                      : "bg-gradient-to-br from-violet-500 to-cyan-400 shadow-lg shadow-violet-500/20"
                  )}
                >
                  {m.role === "user" ? (
                    <User className="h-4 w-4 text-slate-300" />
                  ) : (
                    <GraduationCap className="h-4 w-4 text-white" />
                  )}
                </div>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-3",
                    m.role === "user"
                      ? "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                      : "glass text-slate-100"
                  )}
                >
                  {m.role === "assistant" && !m.content && streaming ? (
                    isSolvingPhoto ? (
                      <div className="flex flex-col gap-2 py-1">
                        <div className="flex items-center gap-2 text-slate-300">
                          <Camera className="h-4 w-4 text-violet-400" />
                          <span className="text-sm font-medium">Reading your photo and solving...</span>
                        </div>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-700">
                          <div className="h-full w-full shimmer rounded-full" />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 py-1 text-slate-400">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-violet-400 [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-pink-400" />
                      </div>
                    )
                  ) : m.role === "assistant" ? (
                    <div className="min-w-0">
                      {i === messages.length - 1 && streamKey > 0 ? (
                        <StreamingMarkdown key={streamKey} text={m.content} />
                      ) : (
                        <Markdown>{m.content}</Markdown>
                      )}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5">
                          <BookOpen className="h-3 w-3 text-slate-500" />
                          {m.sources.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-0.5 text-[11px] text-cyan-200"
                            >
                              {s}
                            </span>
                          ))}
                          {m.sources.length > 3 && (
                            <span className="text-[11px] text-slate-500">+{m.sources.length - 3} more</span>
                          )}
                        </div>
                      )}
                      {m.suggestions && m.suggestions.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/10 pt-3">
                          {m.suggestions.map((s, si) => (
                            <motion.button
                              key={si}
                              onClick={() => send(s)}
                              disabled={streaming}
                              whileHover={{ scale: 1.04 }}
                              whileTap={{ scale: 0.96 }}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0, transition: { delay: 0.15 + si * 0.07 } }}
                              className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-violet-200 transition-colors hover:bg-violet-500/15 hover:border-violet-400/30 hover:text-white"
                            >
                              {s}
                              <span className="ml-0.5 text-violet-400/50">↩</span>
                            </motion.button>
                          ))}
                        </div>
                      )}
                      <button
                        onClick={() => copyMessage(i, m.content)}
                        className="mt-2 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] text-slate-500 transition hover:bg-white/10 hover:text-slate-300"
                        aria-label="Copy answer"
                        title="Copy answer"
                      >
                        {copiedMsg === i ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                  ) : (
                    <div>
                      {m.image && (
                        <div className="mb-2 overflow-hidden rounded-xl border border-white/15 bg-black/30">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.image}
                            alt="Uploaded problem"
                            className="max-h-72 w-full object-contain"
                          />
                          <p className="border-t border-white/10 px-2.5 py-1 text-[10px] uppercase tracking-wide text-slate-500">
                            📷 Photo
                          </p>
                        </div>
                      )}
                      {m.content && (
                        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{m.content}</p>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* input */}
        <div className="mt-4">
          {pendingImage && (
            <div className="mb-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-2 pr-3">
              <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={pendingImage} alt="Selected" className="h-full w-full object-cover" />
                <span className="absolute bottom-1 right-1 rounded-md bg-black/70 px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-300">
                  Vision
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-slate-200">
                  {pendingImageName || "Photo attached"}
                </p>
                <p className="text-[11px] text-slate-500">
                  The tutor will read this photo — add a question and send.
                </p>
              </div>
              <button
                onClick={() => {
                  setPendingImage(null);
                  setPendingImageName(null);
                }}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-slate-400 transition hover:bg-white/10 hover:text-white"
                aria-label="Remove photo"
                title="Remove photo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          {sourceId && typeof sourceId === "number" && (
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-violet-500/15 px-3 py-1 text-xs text-violet-200">
              <FileText className="h-3.5 w-3.5" />
              Using: {localSources.find((s) => s.id === sourceId)?.title ?? `source #${sourceId}`}
              <button
                onClick={() => setSourceId("all")}
                className="ml-1 rounded-full p-0.5 hover:bg-white/10"
                aria-label="Use all sources instead"
                title="Use all sources instead"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
          <div className="glass flex items-end gap-2 rounded-2xl p-2">
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autosize();
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              onPaste={async (e) => {
                const items = e.clipboardData.items;
                for (const item of Array.from(items)) {
                  if (item.type.startsWith("image/")) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (!file) continue;
                    try {
                      const compressed = await compressImageFile(file);
                      setPendingImage(compressed);
                      setPendingImageName("Pasted image");
                    } catch {
                      setMessages((m) => [
                        ...m,
                        {
                          role: "assistant",
                          content: "Couldn't paste that image. Try uploading a smaller photo.",
                        },
                      ]);
                    }
                    break;
                  }
                }
              }}
              rows={1}
              placeholder={
                pendingImage
                  ? "Ask about this photo… e.g. \"Solve this step by step\""
                  : "Ask your tutor anything…  (Shift+Enter for new line)"
              }
              className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-[15px] text-white placeholder:text-slate-500 outline-none"
            />
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              ref={fileRef}
              className="hidden"
              onChange={onPickFile}
            />
            <input type="file" accept="image/*" ref={imgRef} className="hidden" onChange={onPickImage} />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Attach file"
              title="Attach PDF or image as source"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-5 w-5" />}
            </button>
            <button
              onClick={() => imgRef.current?.click()}
              disabled={uploading}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
              aria-label="Attach photo"
              title="Attach a photo to solve with vision AI"
            >
              <Camera className="h-5 w-5" />
            </button>
            {streaming ? (
              <button
                onClick={stopStreaming}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/20 text-red-400 transition hover:bg-red-500/30"
                aria-label="Stop generating"
                title="Stop generating"
              >
                <Square className="h-3.5 w-3.5" fill="currentColor" />
              </button>
            ) : (
              <motion.button
                onClick={() => send(input)}
                disabled={!input.trim() && !pendingImage}
                whileHover={input.trim() || pendingImage ? { scale: 1.06 } : undefined}
                whileTap={input.trim() || pendingImage ? { scale: 0.92 } : undefined}
                className="btn-primary grid h-10 w-10 shrink-0 place-items-center rounded-xl disabled:opacity-55"
                aria-label="Send"
              >
                <Send className="h-4 w-4" />
              </motion.button>
            )}
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <Sparkles className="h-3 w-3 text-violet-300" /> AI can make mistakes — always check important steps.
          </p>
        </div>
      </div>
    </div>
  );
}
