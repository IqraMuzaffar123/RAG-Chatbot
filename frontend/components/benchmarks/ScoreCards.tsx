"use client";

import type { EvalScores } from "@/lib/api";

interface ScoreCardsProps {
  scores: EvalScores | null;
}

const metrics: {
  key: keyof EvalScores;
  label: string;
  color: string;
  desc: string;
  inverted?: boolean;
}[] = [
  { key: "faithfulness", label: "Faithfulness", color: "#10b981", desc: "Grounded in context" },
  { key: "answer_relevancy", label: "Answer Relevancy", color: "#06b6d4", desc: "Addresses the question" },
  { key: "context_precision", label: "Context Precision", color: "#8b5cf6", desc: "Top chunks are relevant" },
  { key: "context_recall", label: "Context Recall", color: "#f59e0b", desc: "Found all relevant chunks" },
  { key: "answer_correctness", label: "Answer Correctness", color: "#60a5fa", desc: "Matches ground truth" },
  { key: "hallucination_rate", label: "Hallucination Rate", color: "#f87171", desc: "Lower is better", inverted: true },
];

function getQualityLabel(value: number, inverted: boolean): string {
  const effective = inverted ? 1 - value : value;
  if (effective > 0.8) return "Excellent";
  if (effective >= 0.5) return "Fair";
  return "Poor";
}

function getQualityColor(value: number, inverted: boolean): string {
  const effective = inverted ? 1 - value : value;
  if (effective > 0.8) return "#10b981";
  if (effective >= 0.5) return "#f59e0b";
  return "#f87171";
}

function formatScore(value: number, inverted: boolean): string {
  if (inverted) return (value * 100).toFixed(1) + "%";
  return value.toFixed(3);
}

function getBarWidth(value: number, inverted: boolean): number {
  return inverted ? (1 - value) * 100 : value * 100;
}

export function ScoreCards({ scores }: ScoreCardsProps) {
  if (!scores) {
    return (
      <div className="grid grid-cols-3 gap-4 mb-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="gradient-card animate-in"
            style={{ padding: "22px", minHeight: 148, animationDelay: `${i * 0.05}s` }}
          >
            <div className="skeleton" style={{ width: 100, height: 14, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: 70, height: 40, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: "100%", height: 6, borderRadius: 4, marginBottom: 8 }} />
            <div className="skeleton" style={{ width: 60, height: 12 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-4 mb-4">
      {metrics.map(({ key, label, color, desc, inverted }, i) => {
        const value = scores[key];
        const qualityLabel = getQualityLabel(value, !!inverted);
        const qualityColor = getQualityColor(value, !!inverted);
        const barWidth = getBarWidth(value, !!inverted);

        return (
          <div
            key={key}
            className="gradient-card animate-in"
            style={{
              padding: "22px 22px 18px",
              minHeight: 148,
              borderTop: `2px solid ${color}`,
              animationDelay: `${i * 0.05}s`,
            }}
          >
            <div className="flex items-start justify-between">
              <span
                className="stat-label"
                style={{ color, fontSize: 13 }}
              >
                {label}
              </span>
            </div>

            <div
              className="stat-number"
              style={{ color: qualityColor, fontSize: 40 }}
            >
              {formatScore(value, !!inverted)}
            </div>

            <div style={{ marginBottom: 8 }}>
              <div
                style={{
                  height: 6,
                  borderRadius: 4,
                  background: "rgba(255,255,255,0.06)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${barWidth}%`,
                    borderRadius: 4,
                    background: qualityColor,
                    transition: "width 0.6s ease",
                  }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-[14px] text-slate-500">{desc}</div>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: qualityColor,
                  background: `${qualityColor}1a`,
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                {qualityLabel}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
