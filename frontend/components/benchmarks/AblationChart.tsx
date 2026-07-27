"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { EvalScores } from "@/lib/api";

interface AblationChartProps {
  byConfig: Record<string, EvalScores> | null;
}

const CONFIGS: { key: string; label: string; color: string }[] = [
  { key: "vector_only", label: "Vector Only", color: "#64748b" },
  { key: "bm25_only", label: "BM25 Only", color: "#f59e0b" },
  { key: "hybrid", label: "Hybrid", color: "#06b6d4" },
  { key: "hybrid_rerank", label: "Hybrid + Rerank", color: "#10b981" },
];

const METRICS: { key: keyof EvalScores; label: string }[] = [
  { key: "faithfulness", label: "Faithfulness" },
  { key: "answer_relevancy", label: "Relevancy" },
  { key: "context_precision", label: "Precision" },
  { key: "context_recall", label: "Recall" },
  { key: "answer_correctness", label: "Correctness" },
];

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div
      style={{
        background: "#0d1320",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
      }}
    >
      <div style={{ color: "#94a3b8", marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} style={{ color: entry.color, marginBottom: 2 }}>
          {entry.name}: {entry.value.toFixed(3)}
        </div>
      ))}
    </div>
  );
};

export function AblationChart({ byConfig }: AblationChartProps) {
  const data = METRICS.map(({ key, label }) => {
    const row: Record<string, string | number> = { metric: label };
    CONFIGS.forEach(({ key: configKey }) => {
      row[configKey] = byConfig?.[configKey]?.[key] ?? 0;
    });
    return row;
  });

  return (
    <div className="gradient-card animate-in" style={{ padding: "22px 22px 18px" }}>
      <div
        className="text-[18px] font-semibold text-slate-200 mb-4"
        style={{ letterSpacing: "-0.01em" }}
      >
        Ablation Study
      </div>

      {!byConfig ? (
        <div
          className="flex items-center justify-center text-slate-500 text-[15px]"
          style={{ height: 260 }}
        >
          No evaluation data yet. Run an evaluation to see results.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="metric"
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              tickCount={5}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(255,255,255,0.03)" }} />
            <Legend
              wrapperStyle={{ fontSize: 13, color: "#94a3b8", paddingTop: 8 }}
            />
            {CONFIGS.map(({ key, label, color }) => (
              <Bar key={key} dataKey={key} name={label} fill={color} radius={[3, 3, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
