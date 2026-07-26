"use client";

import { FileText } from "lucide-react";

interface DocTypeChartProps {
  documentsByType: Record<string, number>;
}

const TYPE_CONFIG: Record<string, { color: string; shadow: string }> = {
  pdf: { color: "#10b981", shadow: "rgba(16,185,129,0.4)" },
  docx: { color: "#06b6d4", shadow: "rgba(6,182,212,0.4)" },
  txt: { color: "#f59e0b", shadow: "rgba(245,158,11,0.4)" },
  doc: { color: "#60a5fa", shadow: "rgba(96,165,250,0.4)" },
  md: { color: "#ec4899", shadow: "rgba(236,72,153,0.4)" },
};

function getConfig(type: string) {
  return (
    TYPE_CONFIG[type.toLowerCase()] || {
      color: "#6b7280",
      shadow: "rgba(107,114,128,0.4)",
    }
  );
}

export function DocTypeChart({ documentsByType }: DocTypeChartProps) {
  const entries = Object.entries(documentsByType);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  if (entries.length === 0) {
    return (
      <div className="glass-card overflow-hidden" style={{ borderRadius: 16 }}>
        <div
          className="flex items-center gap-[9px]"
          style={{
            padding: "16px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <FileText className="w-4 h-4 text-teal-300" />
          <span className="text-[17px] font-semibold text-slate-50">
            Document Types
          </span>
        </div>
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-slate-500">No documents uploaded yet.</p>
        </div>
      </div>
    );
  }

  // Build conic gradient
  let cumDeg = 0;
  const gradientParts: string[] = [];
  entries.forEach(([type, count]) => {
    const deg = (count / total) * 360;
    const { color } = getConfig(type);
    gradientParts.push(`${color} ${cumDeg}deg ${cumDeg + deg}deg`);
    cumDeg += deg;
  });
  const conicGradient = `conic-gradient(${gradientParts.join(",")})`;

  return (
    <div className="glass-card overflow-hidden flex flex-col h-full" style={{ borderRadius: 16 }}>
      {/* Header */}
      <div
        className="flex items-center gap-[9px] shrink-0"
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <FileText className="w-4 h-4 text-teal-300" />
        <span className="text-[16px] font-semibold text-slate-50">
          Document Types
        </span>
      </div>

      {/* Donut + Legend */}
      <div
        className="flex items-center justify-center flex-1 gap-8"
        style={{ padding: "24px 24px" }}
      >
        {/* Donut chart */}
        <div className="relative shrink-0" style={{ width: 140, height: 140 }}>
          <div
            className="rounded-full"
            style={{
              width: 140,
              height: 140,
              background: conicGradient,
            }}
          />
          <div
            className="absolute rounded-full flex flex-col items-center justify-center"
            style={{ inset: 30, background: "#0d1320" }}
          >
            <div className="font-mono text-[28px] font-bold leading-none text-slate-100">
              {total}
            </div>
            <div
              className="mt-1"
              style={{
                fontSize: "10px",
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#64748b",
              }}
            >
              total
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-3">
          {entries.map(([type, count]) => {
            const { color, shadow } = getConfig(type);
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return (
              <div key={type} className="flex items-center gap-3">
                <span
                  className="shrink-0"
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 3,
                    background: color,
                    boxShadow: `0 0 8px ${shadow}`,
                  }}
                />
                <span className="text-[15px] text-slate-300 font-medium" style={{ minWidth: 50 }}>
                  {type.toUpperCase()}
                </span>
                <span className="font-mono text-[14px] text-slate-400">
                  {count} · {pct}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
