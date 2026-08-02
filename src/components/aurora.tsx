"use client";

/** Ambient animated background: drifting gradient orbs + subtle grid. */
export function Aurora() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -top-40 -left-32 h-[36rem] w-[36rem] rounded-full bg-violet-600/25 blur-[120px] animate-aurora" />
      <div
        className="absolute top-1/4 -right-40 h-[34rem] w-[34rem] rounded-full bg-cyan-500/20 blur-[120px] animate-aurora"
        style={{ animationDelay: "-6s" }}
      />
      <div
        className="absolute -bottom-48 left-1/4 h-[32rem] w-[32rem] rounded-full bg-pink-500/15 blur-[120px] animate-aurora"
        style={{ animationDelay: "-12s" }}
      />
      <div className="absolute inset-0 grid-bg opacity-50" />
    </div>
  );
}
