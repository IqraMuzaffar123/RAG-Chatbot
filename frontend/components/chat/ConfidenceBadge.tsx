"use client";

import { ShieldCheck } from "lucide-react";

interface ConfidenceBadgeProps {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);

  let colorClasses: string;
  if (pct >= 80) {
    colorClasses = "bg-emerald-500/15 text-emerald-400 border-emerald-500/20";
  } else if (pct >= 50) {
    colorClasses = "bg-yellow-500/15 text-yellow-400 border-yellow-500/20";
  } else {
    colorClasses = "bg-red-500/15 text-red-400 border-red-500/20";
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${colorClasses}`}
      title="Confidence score based on cross-encoder relevance scores"
    >
      <ShieldCheck className="h-3 w-3" />
      {pct}% confidence
    </span>
  );
}
