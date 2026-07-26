"use client";

import { FileText, Layers, MessageSquare, TrendingUp } from "lucide-react";
import type { StatsResponse } from "@/lib/api";

interface StatsCardsProps {
  stats: StatsResponse | null;
  loading?: boolean;
}

const cards = [
  {
    key: "total_documents" as const,
    label: "Documents",
    desc: "Uploaded files",
    icon: FileText,
    variant: "emerald" as const,
    accentColor: "#10b981",
    format: (v: number) => v.toString(),
  },
  {
    key: "total_chunks" as const,
    label: "Chunks Indexed",
    desc: "Searchable segments",
    icon: Layers,
    variant: "cyan" as const,
    accentColor: "#06b6d4",
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "total_queries" as const,
    label: "Queries",
    desc: "Questions asked",
    icon: MessageSquare,
    variant: "violet" as const,
    accentColor: "#8b5cf6",
    format: (v: number) => v.toString(),
  },
  {
    key: "avg_confidence" as const,
    label: "Avg Confidence",
    desc: "Answer accuracy",
    icon: TrendingUp,
    variant: "amber" as const,
    accentColor: "#f59e0b",
    format: (v: number) => (v * 100).toFixed(0) + "%",
  },
];

export function StatsCards({ stats, loading }: StatsCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-4 mb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="gradient-card animate-in"
            style={{
              padding: "22px",
              minHeight: 140,
              animationDelay: `${i * 0.05}s`,
            }}
          >
            <div className="skeleton" style={{ width: 80, height: 14, marginBottom: 16 }} />
            <div className="skeleton" style={{ width: 60, height: 40, marginBottom: 12 }} />
            <div className="skeleton" style={{ width: 100, height: 12 }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 mb-4">
      {cards.map(({ key, label, desc, icon: Icon, variant, accentColor, format }, i) => (
        <div
          key={key}
          className={`gradient-card gradient-card-${variant} animate-in delay-${i + 1}`}
          style={{ padding: "22px 22px 18px", minHeight: 140 }}
        >
          <div className="flex items-start justify-between">
            <span className="stat-label" style={{ color: accentColor }}>
              {label}
            </span>
            <span
              className="flex items-center justify-center shrink-0"
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: `rgba(255,255,255,0.04)`,
                border: `1px solid rgba(255,255,255,0.06)`,
              }}
            >
              <Icon className="w-5 h-5" style={{ color: accentColor }} />
            </span>
          </div>

          <div className="stat-number">
            {stats ? format(stats[key]) : "--"}
          </div>

          <div className="mt-2 text-[15px] text-slate-500">{desc}</div>
        </div>
      ))}
    </div>
  );
}
