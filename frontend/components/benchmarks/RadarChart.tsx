"use client";

import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
} from "recharts";
import type { EvalScores } from "@/lib/api";

interface MetricsRadarChartProps {
  scores: EvalScores | null;
}

const AXES: { key: keyof EvalScores; label: string }[] = [
  { key: "faithfulness", label: "Faithfulness" },
  { key: "answer_relevancy", label: "Relevancy" },
  { key: "context_precision", label: "Precision" },
  { key: "context_recall", label: "Recall" },
  { key: "answer_correctness", label: "Correctness" },
];

export function MetricsRadarChart({ scores }: MetricsRadarChartProps) {
  const data = AXES.map(({ key, label }) => ({
    subject: label,
    value: scores ? scores[key] : 0,
  }));

  return (
    <div className="gradient-card animate-in" style={{ padding: "22px 22px 18px" }}>
      <div
        className="text-[18px] font-semibold text-slate-200 mb-4"
        style={{ letterSpacing: "-0.01em" }}
      >
        Quality Profile
      </div>

      {!scores ? (
        <div
          className="flex items-center justify-center text-slate-500 text-[15px]"
          style={{ height: 260 }}
        >
          No evaluation data yet. Run an evaluation to see results.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <RechartsRadar data={data} outerRadius={90}>
            <PolarGrid stroke="rgba(255,255,255,0.08)" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fontSize: 13, fill: "#94a3b8" }}
            />
            <PolarRadiusAxis
              angle={90}
              domain={[0, 1]}
              tick={{ fontSize: 11, fill: "#64748b" }}
              tickCount={4}
            />
            <Radar
              name="Score"
              dataKey="value"
              stroke="#10b981"
              fill="#10b981"
              fillOpacity={0.2}
              strokeWidth={2}
            />
          </RechartsRadar>
        </ResponsiveContainer>
      )}
    </div>
  );
}
