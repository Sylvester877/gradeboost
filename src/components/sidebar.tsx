"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  BookOpen,
  MessagesSquare,
  ListChecks,
  Layers,
  Settings,
  Sparkles,
  Search,
  Target,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/tutor", label: "AI Tutor", icon: MessagesSquare },
  { href: "/app/textbook", label: "Textbook", icon: Search },
  { href: "/app/quizzes", label: "Quizzes", icon: ListChecks },
  { href: "/app/practice", label: "Practice", icon: Target },
  { href: "/app/flashcards", label: "Flashcards", icon: Layers },
  { href: "/app/sources", label: "Sources", icon: BookOpen },
  { href: "/app/settings", label: "Settings", icon: Settings },
];

const COLLAPSED_KEY = "gradeboost-sidebar-collapsed";

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const toggle = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  return (
    <>
      {/* Expand button — shown only when collapsed and on desktop */}
      <AnimatePresence>
        {collapsed && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={toggle}
            className="fixed left-4 top-4 z-50 hidden h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[#0b0b14] text-slate-400 shadow-lg shadow-violet-500/10 transition-all hover:bg-white/10 hover:text-white hover:shadow-violet-500/25 lg:flex"
            aria-label="Open sidebar"
            title="Open sidebar"
          >
            <PanelLeft className="h-4 w-4" />
          </motion.button>
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "sticky top-0 z-40 hidden h-screen shrink-0 flex-col border-r border-white/6 px-3 py-6 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:flex",
          collapsed ? "w-16 items-center" : "w-60"
        )}
      >
        {/* Logo */}
        <Link
          href="/app"
          className={cn(
            "mb-8 flex items-center gap-2.5 transition-all duration-300",
            collapsed ? "justify-center" : "px-1"
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/studyapplogo.png"
            alt="GradeBoost"
            className="h-9 w-9 rounded-xl object-cover shadow-lg shadow-violet-500/30 shrink-0 transition-transform duration-300 hover:scale-105"
          />
          <AnimatePresence>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden leading-tight"
              >
                <p className="font-display text-lg font-semibold text-white whitespace-nowrap">
                  GradeBoost
                </p>
                <p className="text-[11px] text-slate-400 whitespace-nowrap">
                  Better grades, faster
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </Link>

        {/* Navigation */}
        <nav className="flex flex-col gap-1" onMouseLeave={() => setHoveredIdx(null)}>
          {NAV.map((item, idx) => {
            const active =
              item.href === "/app"
                ? pathname === "/app"
                : pathname.startsWith(item.href);
            const Icon = item.icon;
            const isHovered = hoveredIdx === idx;

            return (
              <div key={item.href} className="relative">
                <Link
                  href={item.href}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-all duration-200",
                    collapsed ? "justify-center px-0" : "px-3",
                    active
                      ? "text-white"
                      : "text-slate-400 hover:text-white"
                  )}
                >
                  {active && (
                    <motion.div
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl bg-white/8 ring-1 ring-white/10 shadow-[0_0_12px_rgba(124,92,255,0.15)]"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon
                    className={cn(
                      "relative z-10 h-[18px] w-[18px] shrink-0 transition-transform duration-200",
                      isHovered && !active && "scale-110"
                    )}
                  />
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="relative z-10 overflow-hidden whitespace-nowrap"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>

                {/* Tooltip on collapsed hover */}
                <AnimatePresence>
                  {collapsed && isHovered && (
                    <motion.div
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -4 }}
                      className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50 rounded-lg bg-[#1a1a2e] border border-white/15 px-2.5 py-1.5 shadow-xl"
                    >
                      <p className="text-xs font-medium text-white whitespace-nowrap">{item.label}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        {/* Footer promo card */}
        <div className="mt-auto">
          <AnimatePresence>
            {!collapsed ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="glass relative overflow-hidden rounded-2xl p-4 transition-all hover:bg-white/8"
              >
                <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-violet-500/30 blur-2xl" />
                <div className="relative flex items-center gap-2 text-violet-300">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    Free AI
                  </span>
                </div>
                <p className="relative mt-2 text-xs leading-relaxed text-slate-400">
                  Nemotron 3 Ultra powers every answer — and it reads ALL your
                  uploaded sources for the subject you&apos;re studying.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex justify-center"
              >
                <div className="grid h-8 w-8 place-items-center rounded-full bg-violet-500/20 transition-all hover:bg-violet-500/30 hover:scale-105">
                  <Sparkles className="h-3.5 w-3.5 text-violet-300" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={toggle}
          className={cn(
            "mt-3 flex items-center justify-center rounded-xl py-2 text-slate-500 transition-all hover:bg-white/8 hover:text-slate-300",
            collapsed ? "w-full" : "px-3"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <PanelLeftClose
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-300",
              collapsed && "rotate-180"
            )}
          />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="ml-2 overflow-hidden whitespace-nowrap text-xs"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </aside>
    </>
  );
}

/** Mobile bottom tab bar. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-white/8 bg-[#0b0b14]/90 px-2 py-2 backdrop-blur-xl lg:hidden">
      {NAV.slice(0, 5).map((item) => {
        const active =
          item.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] font-medium transition-all",
              active
                ? "text-cyan-300"
                : "text-slate-500 hover:text-slate-300"
            )}
          >
            <Icon className={cn(
              "h-5 w-5 transition-transform",
              active && "scale-110"
            )} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
