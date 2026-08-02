"use client";

import { memo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";

/* ---------- type definitions ---------- */

interface SimpleDatum {
  label: string;
  value: number;
}

interface XYPoint {
  x: number;
  y: number;
}

interface SeriesDef {
  name: string;
  data: XYPoint[];
  color?: string;
}

export interface ChartDef {
  type: "bar" | "line" | "scatter" | "pie" | "area" | "multiline";
  title?: string;
  xLabel?: string;
  yLabel?: string;
  data?: SimpleDatum[];
  points?: XYPoint[];
  series?: SeriesDef[];
}

/* ---------- color palette ---------- */

const COLORS = [
  "#7c5cff",
  "#22d3ee",
  "#f472b6",
  "#fbbf24",
  "#34d399",
  "#fb7185",
  "#a78bfa",
  "#38bdf8",
];

/* ---------- component ---------- */

function ChartRendererBase({
  chart,
}: {
  chart: ChartDef;
}) {
  const { type, title, xLabel, yLabel } = chart;

  const renderChart = () => {
    switch (type) {
      /* ---- bar ---- */
      case "bar": {
        const data = chart.data ?? [];
        return (
          <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#9a9cb5" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              label={
                xLabel
                  ? {
                      value: xLabel,
                      position: "insideBottom",
                      offset: -6,
                      fill: "#9a9cb5",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9a9cb5" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              label={
                yLabel
                  ? {
                      value: yLabel,
                      angle: -90,
                      position: "insideLeft",
                      offset: 8,
                      fill: "#9a9cb5",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                background: "rgba(14,14,24,0.95)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "#e8e9f3",
                fontSize: 13,
              }}
            />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        );
      }

      /* ---- pie ---- */
      case "pie": {
        const data = chart.data ?? [];
        return (
          <PieChart margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              outerRadius={100}
              innerRadius={40}
              label={({ name, percent }) =>
                `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
              }
              labelLine={{ stroke: "rgba(255,255,255,0.2)" }}
            >
              {data.map((_, i) => (
                <Cell
                  key={i}
                  fill={COLORS[i % COLORS.length]}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: "rgba(14,14,24,0.95)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "#e8e9f3",
                fontSize: 13,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#9a9cb5" }}
            />
          </PieChart>
        );
      }

      /* ---- scatter ---- */
      case "scatter": {
        const data = chart.points ?? [];
        return (
          <ScatterChart margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="x"
              tick={{ fontSize: 12, fill: "#9a9cb5" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              label={
                xLabel
                  ? {
                      value: xLabel,
                      position: "insideBottom",
                      offset: -6,
                      fill: "#9a9cb5",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
            <YAxis
              dataKey="y"
              tick={{ fontSize: 12, fill: "#9a9cb5" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              label={
                yLabel
                  ? {
                      value: yLabel,
                      angle: -90,
                      position: "insideLeft",
                      offset: 8,
                      fill: "#9a9cb5",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                background: "rgba(14,14,24,0.95)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "#e8e9f3",
                fontSize: 13,
              }}
            />
            <Scatter data={data} fill="#7c5cff" />
          </ScatterChart>
        );
      }

      /* ---- line (single series from data[]) ---- */
      case "line": {
        const data = chart.data ?? [];
        return (
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#9a9cb5" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              label={
                xLabel
                  ? {
                      value: xLabel,
                      position: "insideBottom",
                      offset: -6,
                      fill: "#9a9cb5",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9a9cb5" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              label={
                yLabel
                  ? {
                      value: yLabel,
                      angle: -90,
                      position: "insideLeft",
                      offset: 8,
                      fill: "#9a9cb5",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                background: "rgba(14,14,24,0.95)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "#e8e9f3",
                fontSize: 13,
              }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#7c5cff"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#7c5cff" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        );
      }

      /* ---- area ---- */
      case "area": {
        const data = chart.data ?? [];
        return (
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#9a9cb5" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              label={
                xLabel
                  ? {
                      value: xLabel,
                      position: "insideBottom",
                      offset: -6,
                      fill: "#9a9cb5",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9a9cb5" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              label={
                yLabel
                  ? {
                      value: yLabel,
                      angle: -90,
                      position: "insideLeft",
                      offset: 8,
                      fill: "#9a9cb5",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                background: "rgba(14,14,24,0.95)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "#e8e9f3",
                fontSize: 13,
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#7c5cff"
              strokeWidth={2}
              fill="rgba(124, 92, 255, 0.18)"
            />
          </AreaChart>
        );
      }

      /* ---- multiline (series[]) ---- */
      case "multiline": {
        const seriesData = chart.series ?? [];
        if (seriesData.length === 0) return <p className="text-slate-500 text-sm">No data.</p>;

        // Merge all series into one array keyed by x (label)
        const xMap = new Map<number, Record<string, number>>();
        for (const s of seriesData) {
          for (const pt of s.data) {
            if (!xMap.has(pt.x)) xMap.set(pt.x, {});
            xMap.get(pt.x)![s.name] = pt.y;
          }
        }
        const merged = Array.from(xMap.entries())
          .sort(([a], [b]) => a - b)
          .map(([x, vals]) => ({ label: String(x), ...vals }));

        return (
          <LineChart data={merged} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: "#9a9cb5" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              label={
                xLabel
                  ? {
                      value: xLabel,
                      position: "insideBottom",
                      offset: -6,
                      fill: "#9a9cb5",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
            <YAxis
              tick={{ fontSize: 12, fill: "#9a9cb5" }}
              axisLine={{ stroke: "rgba(255,255,255,0.08)" }}
              tickLine={false}
              label={
                yLabel
                  ? {
                      value: yLabel,
                      angle: -90,
                      position: "insideLeft",
                      offset: 8,
                      fill: "#9a9cb5",
                      fontSize: 12,
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                background: "rgba(14,14,24,0.95)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 12,
                color: "#e8e9f3",
                fontSize: 13,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#9a9cb5" }}
            />
            {seriesData.map((s, i) => (
              <Line
                key={s.name}
                type="monotone"
                dataKey={s.name}
                stroke={s.color ?? COLORS[i % COLORS.length]}
                strokeWidth={2.5}
                dot={{ r: 2 }}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        );
      }

      default:
        return <p className="text-slate-500 text-sm">Unknown chart type: {type}</p>;
    }
  };

  return (
    <div className="my-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      {title && (
        <h4 className="mb-3 font-display text-sm font-semibold text-slate-200">
          {title}
        </h4>
      )}
      <div className="h-64 w-full sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export const ChartRenderer = memo(ChartRendererBase);
