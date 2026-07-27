"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import type { EvalRun } from "@/lib/api";

interface EvalHistoryProps {
  runs: EvalRun[];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatDuration(s?: number): string {
  if (s == null) return "—";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

export function EvalHistory({ runs }: EvalHistoryProps) {
  if (!runs || runs.length === 0) return null;

  return (
    <div className="gradient-card animate-in" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ padding: "18px 22px 14px" }}>
        <div
          className="text-[18px] font-semibold text-slate-200"
          style={{ letterSpacing: "-0.01em" }}
        >
          Evaluation History
        </div>
      </div>
      <div>
        {runs.map((run, i) => {
          const isCompleted = run.status === "completed";
          const isFailed = run.status === "failed";

          return (
            <div
              key={run.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 22px",
                borderTop: "1px solid rgba(255,255,255,0.04)",
                background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              }}
            >
              {/* Status icon */}
              <span style={{ flexShrink: 0 }}>
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5" style={{ color: "#10b981" }} />
                ) : isFailed ? (
                  <XCircle className="w-5 h-5" style={{ color: "#f87171" }} />
                ) : (
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "2px solid #f59e0b",
                      borderTopColor: "transparent",
                      animation: "ad-spin 0.8s linear infinite",
                    }}
                  />
                )}
              </span>

              {/* Run ID */}
              <span
                style={{
                  fontFamily: "var(--font-mono), ui-monospace, monospace",
                  fontSize: 13,
                  color: "#94a3b8",
                  flexShrink: 0,
                  minWidth: 100,
                }}
              >
                {run.id.slice(0, 8)}…
              </span>

              {/* Date */}
              <span style={{ fontSize: 14, color: "#64748b", flexShrink: 0, minWidth: 140 }}>
                {formatDate(run.started_at)}
              </span>

              {/* Duration */}
              <span style={{ fontSize: 14, color: "#94a3b8", flexShrink: 0, minWidth: 80 }}>
                {formatDuration(run.duration_seconds)}
              </span>

              {/* Questions count */}
              {run.total_questions != null && (
                <span style={{ fontSize: 14, color: "#64748b", flexShrink: 0 }}>
                  {run.total_questions} questions
                </span>
              )}

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Status badge */}
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  padding: "3px 10px",
                  borderRadius: 6,
                  textTransform: "uppercase",
                  color: isCompleted ? "#10b981" : isFailed ? "#f87171" : "#f59e0b",
                  background: isCompleted
                    ? "rgba(16,185,129,0.12)"
                    : isFailed
                    ? "rgba(239,68,68,0.12)"
                    : "rgba(245,158,11,0.12)",
                }}
              >
                {run.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
