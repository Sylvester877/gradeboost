export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

/** Group an array by a key function. */
export function groupBy<T>(arr: T[], key: (item: T) => string) {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
}

/** Format a date relative to now, e.g. "2h ago". */
export function timeAgo(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString();
}

/** Tailwind class for a score / grade colour. */
export function scoreColor(pct: number) {
  if (pct >= 85) return "text-emerald-400";
  if (pct >= 70) return "text-cyan-400";
  if (pct >= 50) return "text-amber-400";
  return "text-rose-400";
}

export function scoreRing(pct: number) {
  if (pct >= 85) return "#34d399";
  if (pct >= 70) return "#22d3ee";
  if (pct >= 50) return "#fbbf24";
  return "#fb7185";
}

/** Convert a percentage to an Australian letter grade. */
export function toGrade(pct: number) {
  if (pct >= 85) return "A";
  if (pct >= 70) return "B";
  if (pct >= 60) return "C";
  if (pct >= 50) return "D";
  return "E";
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function dayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}
