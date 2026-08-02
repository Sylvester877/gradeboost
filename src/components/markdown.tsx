"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { memo, useMemo } from "react";
import { ChartRenderer, type ChartDef } from "@/components/chart-renderer";

const VALID_CHART_TYPES = ["bar", "line", "area", "pie", "scatter", "multiline"];

/**
 * Parse a ```chart code block into a ChartDef object.
 * Returns null if parsing fails.
 */
function parseChartJson(raw: string): ChartDef | null {
  try {
    const obj = JSON.parse(raw);
    if (!obj || typeof obj !== "object" || !obj.type) return null;
    if (!VALID_CHART_TYPES.includes(obj.type as string)) return null;
    return obj as ChartDef;
  } catch {
    return null;
  }
}

/**
 * Renders AI markdown + GFM tables + LaTeX (KaTeX) + interactive charts.
 *
 * Detects ```chart code blocks tagged with JSON and renders them as
 * Recharts visualisations instead of raw code.
 */
function MarkdownBase({ children }: { children: string }) {
  // Strip suggestion blocks that might leak through (belt-and-suspenders —
  // the tutor-client already strips them, but this catches any edge cases).
  const cleaned = children.replace(/\[SUGGESTIONS\]\r?\n[\s\S]*?\[\/SUGGESTIONS\]/gi, "").trim();

  // Split the content on chart blocks so we can render them inline.
  const segments = useMemo(() => {
    const parts: Array<{ type: "md" | "chart"; content: string }> = [];
    const regex = /```chart\r?\n([\s\S]*?)```/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(cleaned)) !== null) {
      // push markdown before this block
      if (match.index > last) {
        parts.push({ type: "md", content: cleaned.slice(last, match.index) });
      }
      parts.push({ type: "chart", content: match[1].trim() });
      last = match.index + match[0].length;
    }
    // remainder
    if (last < cleaned.length) {
      parts.push({ type: "md", content: cleaned.slice(last) });
    }
    return parts.length > 0 ? parts : [{ type: "md" as const, content: cleaned }];
  }, [cleaned]);

  return (
    <div className="prose-tight max-w-none text-[15px] leading-relaxed text-slate-200">
      {segments.map((seg, i) => {
        if (seg.type === "chart") {
          const chart = parseChartJson(seg.content);
          if (!chart) {
            // fallback: show raw JSON as code
            return (
              <pre key={i} className="my-2 rounded-xl bg-black/40 p-3 text-xs text-slate-400">
                {seg.content}
              </pre>
            );
          }
          return <ChartRenderer key={i} chart={chart} />;
        }
        return (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
          >
            {seg.content}
          </ReactMarkdown>
        );
      })}
    </div>
  );
}

export const Markdown = memo(MarkdownBase);
