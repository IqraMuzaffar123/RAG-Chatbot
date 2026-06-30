"use client";

import { FileText, Layers, Search, ShieldCheck } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { StatsResponse } from "@/lib/api";

interface StatsCardsProps {
  stats: StatsResponse | null;
}

const cards = [
  {
    key: "total_documents" as const,
    label: "Documents",
    icon: FileText,
    color: "text-blue-400",
    bgColor: "bg-blue-400/10",
    format: (v: number) => v.toString(),
  },
  {
    key: "total_chunks" as const,
    label: "Chunks",
    icon: Layers,
    color: "text-purple-400",
    bgColor: "bg-purple-400/10",
    format: (v: number) => v.toLocaleString(),
  },
  {
    key: "total_queries" as const,
    label: "Queries",
    icon: Search,
    color: "text-amber-400",
    bgColor: "bg-amber-400/10",
    format: (v: number) => v.toString(),
  },
  {
    key: "avg_confidence" as const,
    label: "Avg Confidence",
    icon: ShieldCheck,
    color: "text-emerald-400",
    bgColor: "bg-emerald-400/10",
    format: (v: number) => (v * 100).toFixed(0) + "%",
  },
];

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, color, bgColor, format }) => (
        <Card
          key={key}
          className="border-0 bg-slate-800/60 ring-white/5"
        >
          <CardContent className="flex items-center gap-4 pt-1">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${bgColor}`}>
              <Icon className={`h-6 w-6 ${color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">
                {stats ? format(stats[key]) : "--"}
              </p>
              <p className="text-xs text-slate-400">{label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
