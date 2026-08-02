"use client";

import { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  KeyRound,
  Cpu,
  GraduationCap,
  Zap,
  RefreshCw,
  Download,
  RotateCcw,
  Rocket,
} from "lucide-react";
import { Reveal } from "@/components/ui";

type TestResult = { ok: boolean; text: string } | null;

// Shape of the updater status pushed by the Electron main process via preload.
type UpdaterStatus = {
  stage: string;
  currentVersion: string;
  message: string;
  percent: number;
  version: string;
};

type UpdaterApi = {
  getStatus: () => Promise<UpdaterStatus>;
  check: () => Promise<unknown>;
  download: () => Promise<unknown>;
  install: () => Promise<unknown>;
  onStatus: (cb: (s: UpdaterStatus) => void) => () => void;
};

// Returns the updater API when running inside the packaged Electron app, or
// null when running in a plain browser (dev mode) where there is no updater.
function getUpdater(): UpdaterApi | null {
  if (typeof window !== "undefined" && (window as unknown as { gradeboostUpdater?: UpdaterApi }).gradeboostUpdater) {
    return (window as unknown as { gradeboostUpdater: UpdaterApi }).gradeboostUpdater;
  }
  return null;
}

export default function SettingsPage() {
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("A");
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);
  const [model, setModel] = useState("");
  const [visionModel, setVisionModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TestResult>(null);
  // The updater API is a stable property on window (injected by preload) —
  // read it during render instead of via setState-in-effect.
  const updater = getUpdater();
  const [updaterStatus, setUpdaterStatus] = useState<UpdaterStatus | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setName(d.name || "");
        setGrade(d.targetGrade || "A");
        setAiEnabled(Boolean(d.aiEnabled));
        setModel(d.model || "");
        setVisionModel(d.visionModel || "");
      })
      .catch(() => setAiEnabled(false));
  }, []);

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setTestResult({
          ok: true,
          text: `✓ Connected — ${data.model} replied in ${(data.latencyMs / 1000).toFixed(1)}s`,
        });
      } else {
        setTestResult({ ok: false, text: `✗ ${data.error || "Connection failed"}` });
      }
    } catch {
      setTestResult({ ok: false, text: "✗ Could not reach the test endpoint." });
    } finally {
      setTesting(false);
    }
  }

  async function save() {
    setSaving(true);
    await Promise.all([
      fetch("/api/settings", {
        method: "POST",
        body: JSON.stringify({ key: "name", value: name }),
        headers: { "Content-Type": "application/json" },
      }),
      fetch("/api/settings", {
        method: "POST",
        body: JSON.stringify({ key: "targetGrade", value: grade }),
        headers: { "Content-Type": "application/json" },
      }),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // --- Auto-update wiring (packaged app only) ---
  useEffect(() => {
    if (!updater) return;
    let active = true;
    const unsub = updater.onStatus((s) => {
      if (!active) return;
      setUpdaterStatus(s);
      if (s.stage !== "checking") setChecking(false);
    });
    updater
      .getStatus()
      .then((s) => active && setUpdaterStatus(s))
      .catch(() => {});
    return () => {
      active = false;
      unsub();
    };
  }, [updater]);

  async function checkForUpdate() {
    if (!updater) return;
    setChecking(true);
    try {
      await updater.check();
    } catch {
      setChecking(false);
    }
  }

  async function downloadUpdate() {
    if (!updater) return;
    try {
      await updater.download();
    } catch {
      // status pushed via onStatus
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-2">
      <div>
        <h1 className="font-display text-3xl font-bold text-white">Settings</h1>
        <p className="mt-1 text-slate-400">Personalise your study experience.</p>
      </div>

      <Reveal>
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-violet-300" />
            <h2 className="font-display text-lg font-semibold text-white">Your profile</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Display name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={inputCls}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-slate-400">Target grade</span>
              <div className="flex gap-1.5">
                {["A", "B", "C", "D"].map((g) => (
                  <button
                    key={g}
                    onClick={() => setGrade(g)}
                    className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition ${
                      grade === g
                        ? "bg-gradient-to-r from-violet-500 to-cyan-500 text-white"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </label>
          </div>
          <button
            onClick={save}
            disabled={saving}
            className="btn-primary mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            {saved ? "Saved!" : "Save profile"}
          </button>
        </div>
      </Reveal>

      <Reveal delay={0.1}>
        <div className="glass rounded-2xl p-6">
          <div className="mb-4 flex items-center gap-2">
            <Cpu className="h-5 w-5 text-cyan-300" />
            <h2 className="font-display text-lg font-semibold text-white">AI connection</h2>
          </div>

          <div
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              aiEnabled
                ? "border-emerald-400/30 bg-emerald-500/10"
                : "border-amber-400/30 bg-amber-500/10"
            }`}
          >
            {aiEnabled ? (
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
            )}
            <div className="text-sm">
              <p className="font-medium text-white">
                {aiEnabled ? "Live AI connected" : "Demo mode active"}
              </p>            <p className="text-slate-400">
              {aiEnabled
                ? "Connected via OpenRouter."
                : "Add an API key to unlock live AI answers and generation."}
            </p>
            </div>
          </div>

          {(model || visionModel) && (
            <div className="mt-3 space-y-1.5 rounded-xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-medium text-slate-300">Active models</p>
              {model && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">Text / tutor</span>
                  <span className="font-mono text-slate-200">{model}</span>
                </div>
              )}
              {visionModel && (
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="text-slate-400">Vision / photos</span>
                  <span className="font-mono text-slate-200">{visionModel}</span>
                </div>
              )}
            </div>
          )}

          <div className="mt-3 rounded-xl border border-violet-400/20 bg-violet-500/5 p-3 text-xs text-slate-400">
            <span className="font-medium text-violet-200">Using free endpoints only.</span>{" "}
            {aiEnabled ? (
              <>
                OpenRouter free tier is active — Nemotron 3 Ultra (text) and a free
                vision-capable model (photos).
              </>
            ) : (
              <>OpenRouter free tier is available; add a key to enable live answers.</>
            )}
          </div>

          <button
            onClick={testConnection}
            disabled={testing}
            className="btn-primary mt-4 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm disabled:opacity-55"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            {testing ? "Testing…" : "Test AI connection"}
          </button>
          {testResult && (
            <p
              className={`mt-2 rounded-lg px-3 py-2 text-xs ${
                testResult.ok
                  ? "bg-emerald-500/10 text-emerald-300"
                  : "bg-rose-500/10 text-rose-300"
              }`}
            >
              {testResult.text}
            </p>
          )}

          <div className="mt-5 rounded-xl bg-black/30 p-4">
            <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-slate-300">
              <KeyRound className="h-3.5 w-3.5 text-violet-300" /> How to enable live AI
            </div>
            <ol className="list-decimal space-y-1 pl-5 text-xs text-slate-400">
              <li>
                Get a free OpenRouter key at{" "}
                <a
                  href="https://openrouter.ai/keys"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 underline"
                >
                  openrouter.ai/keys
                </a>
              </li>
              <li>
                Go to{" "}
                <a
                  href="https://openrouter.ai/settings/privacy"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-300 underline"
                >
                  openrouter.ai/settings/privacy
                </a>{" "}
                and opt in to data sharing so the free Nemotron 3 Ultra endpoint is available.
              </li>
              <li>
                Add to your <code className="rounded bg-white/10 px-1">.env</code>:
              </li>
            </ol>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-black/50 p-3 text-xs text-emerald-300">
              <code>{`OPENROUTER_API_KEY=sk-or-v1-...
# optional: switch to the paid slug if the free one is unavailable
# OPENROUTER_MODEL=nvidia/nemotron-3-ultra-550b-a55b`}</code>
            </pre>
            <p className="mt-2 text-[11px] text-slate-500">
              Restart the server after editing .env. The app works in demo mode without a key.
            </p>
          </div>
        </div>
      </Reveal>

      {/* Gate on updaterStatus (null on both server and client until the effect
          runs) so SSR HTML matches the client — avoids a hydration mismatch. */}
      {updater && updaterStatus && (
        <Reveal delay={0.15}>
          <div className="glass rounded-2xl p-6">
            <div className="mb-4 flex items-center gap-2">
              <Rocket className="h-5 w-5 text-emerald-300" />
              <h2 className="font-display text-lg font-semibold text-white">Updates</h2>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="min-w-0 text-sm">
                <p className="font-medium text-white">
                  {updaterStatus?.message || (updaterStatus ? "" : "Checking…")}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">
                  Current version: {updaterStatus?.currentVersion || "—"}
                  {updaterStatus?.version && updaterStatus.stage === "available"
                    ? ` · New version: ${updaterStatus.version}`
                    : ""}
                </p>
                {updaterStatus?.stage === "downloading" && updaterStatus.percent > 0 && (
                  <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all"
                      style={{ width: `${updaterStatus.percent}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                {updaterStatus?.stage !== "available" &&
                  updaterStatus?.stage !== "downloaded" &&
                  updaterStatus?.stage !== "downloading" && (
                    <button
                      onClick={checkForUpdate}
                      disabled={checking}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-white/10 disabled:opacity-55"
                    >
                      {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      {checking ? "Checking…" : "Check for updates"}
                    </button>
                  )}
                {updaterStatus?.stage === "available" && (
                  <button
                    onClick={downloadUpdate}
                    className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
                  >
                    <Download className="h-4 w-4" />
                    Download update
                  </button>
                )}
                {updaterStatus?.stage === "downloaded" && (
                  <button
                    onClick={() => updater.install()}
                    className="btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Restart & install
                  </button>
                )}
              </div>
            </div>

            {updaterStatus?.stage === "error" && (
              <p className="mt-2 rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">
                {updaterStatus.message}
              </p>
            )}
          </div>
        </Reveal>
      )}

      <Reveal delay={0.15}>
        <p className="text-center text-xs text-slate-600">
          GradeBoost · Built for Essential Mathematics for the Australian Curriculum (Year 10)
        </p>
      </Reveal>
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-violet-400/50";
