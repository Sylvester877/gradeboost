"use client";

import { motion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { scoreRing } from "@/lib/utils";

/** Animated circular progress ring. */
export function ProgressRing({
  value,
  size = 120,
  stroke = 10,
  label,
  sublabel,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  const color = scoreRing(value);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.1, ease: "easeOut" }}
          style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-2xl font-semibold text-white">{label}</span>
        {sublabel && <span className="text-xs text-slate-400">{sublabel}</span>}
      </div>
    </div>
  );
}

/** Staggered reveal wrapper. */
export function Reveal({
  children,
  delay = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Count-up number that animates from 0 to `value` when scrolled into view. */
export function CountUp({
  value,
  duration = 1.2,
  suffix = "",
  className,
}: {
  value: number;
  duration?: number;
  suffix?: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / (duration * 1000));
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, value, duration]);

  return (
    <span ref={ref} className={className}>
      {display}
      {suffix}
    </span>
  );
}

/** Animated horizontal progress bar. */
export function AnimatedBar({
  value,
  className = "",
  barClassName = "",
  delay = 0,
}: {
  value: number;
  className?: string;
  barClassName?: string;
  delay?: number;
}) {
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-white/8 ${className}`}>
      <motion.div
        className={`h-full rounded-full ${barClassName}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`shimmer rounded-xl bg-white/5 ${className}`} />;
}
