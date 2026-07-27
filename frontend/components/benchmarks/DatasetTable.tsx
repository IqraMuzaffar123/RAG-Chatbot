"use client";

import type { EvalScores } from "@/lib/api";

interface DatasetTableProps {
  byDataset: Record<string, EvalScores> | null;
}

const DATASET_LABELS: Record<string, string> = {
  squad_v2: "SQuAD 2.0",
  natural_questions: "Natural Questions",
  hotpot_qa: "HotpotQA",
};

const METRIC_KEYS: (keyof EvalScores)[] = [
  "faithfulness",
  "answer_relevancy",
  "context_precision",
  "context_recall",
  "answer_correctness",
  "hallucination_rate",
];

const METRIC_LABELS: Record<keyof EvalScores, string> = {
  faithfulness: "Faithfulness",
  answer_relevancy: "Relevancy",
  context_precision: "Precision",
  context_recall: "Recall",
  answer_correctness: "Correctness",
  hallucination_rate: "Halluc. Rate",
};

function getCellStyle(metric: keyof EvalScores, value: number): React.CSSProperties {
  const inverted = metric === "hallucination_rate";
  const effective = inverted ? 1 - value : value;
  if (effective > 0.8)
    return { background: "rgba(16,185,129,0.12)", color: "#34d399" };
  if (effective >= 0.5)
    return { background: "rgba(245,158,11,0.12)", color: "#fbbf24" };
  return { background: "rgba(239,68,68,0.12)", color: "#f87171" };
}

export function DatasetTable({ byDataset }: DatasetTableProps) {
  if (!byDataset || Object.keys(byDataset).length === 0) return null;

  const datasets = Object.keys(byDataset);

  return (
    <div className="gradient-card animate-in mb-4" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "18px 22px 14px" }}>
        <div
          className="text-[18px] font-semibold text-slate-200"
          style={{ letterSpacing: "-0.01em" }}
        >
          Per-Dataset Breakdown
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <th
                style={{
                  padding: "10px 22px",
                  textAlign: "left",
                  fontSize: 14,
                  textTransform: "uppercase",
                  letterSpacing: "0.07em",
                  color: "#64748b",
                  fontWeight: 600,
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                Dataset
              </th>
              {METRIC_KEYS.map((k) => (
                <th
                  key={k}
                  style={{
                    padding: "10px 16px",
                    textAlign: "center",
                    fontSize: 14,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                    color: "#64748b",
                    fontWeight: 600,
                    background: "rgba(255,255,255,0.02)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {METRIC_LABELS[k]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datasets.map((dataset, rowIdx) => {
              const scores = byDataset[dataset];
              return (
                <tr
                  key={dataset}
                  style={{
                    borderTop: "1px solid rgba(255,255,255,0.04)",
                    background: rowIdx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
                  }}
                >
                  <td
                    style={{
                      padding: "12px 22px",
                      fontSize: 16,
                      color: "#e2e8f0",
                      fontWeight: 500,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {DATASET_LABELS[dataset] ?? dataset}
                  </td>
                  {METRIC_KEYS.map((k) => {
                    const value = scores[k];
                    const inverted = k === "hallucination_rate";
                    const display = inverted
                      ? (value * 100).toFixed(1) + "%"
                      : value.toFixed(3);
                    const cellStyle = getCellStyle(k, value);
                    return (
                      <td
                        key={k}
                        style={{
                          padding: "10px 16px",
                          textAlign: "center",
                          fontSize: 16,
                        }}
                      >
                        <span
                          style={{
                            display: "inline-block",
                            padding: "3px 10px",
                            borderRadius: 8,
                            fontWeight: 600,
                            fontVariantNumeric: "tabular-nums",
                            ...cellStyle,
                          }}
                        >
                          {display}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
