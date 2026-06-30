"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SourceInfo } from "@/lib/api";

interface SourceCardProps {
  source: SourceInfo;
  index: number;
}

function getScoreColor(score: number): string {
  if (score >= 0.8) return "bg-emerald-500";
  if (score >= 0.6) return "bg-emerald-400";
  if (score >= 0.4) return "bg-yellow-400";
  if (score >= 0.2) return "bg-orange-400";
  return "bg-red-400";
}

export function SourceCard({ source, index }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);

  const scorePercent = Math.round(source.relevance_score * 100);

  return (
    <Card className="border-0 bg-slate-800/80 ring-white/5">
      <CardContent className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className="border-slate-600 text-slate-400 shrink-0"
              >
                #{index + 1}
              </Badge>
              <div className="flex items-center gap-1.5 min-w-0">
                <FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate text-sm font-medium text-slate-200">
                  {source.document_name}
                </span>
              </div>
            </div>
            <div className="mt-1.5 flex items-center gap-3">
              <span className="text-xs text-slate-400">
                Page {source.page_number}
              </span>
            </div>
          </div>
        </div>

        {/* Relevance score bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-500">Relevance</span>
            <span className="text-xs font-medium text-slate-300">
              {scorePercent}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-700">
            <div
              className={`h-full rounded-full transition-all ${getScoreColor(source.relevance_score)}`}
              style={{ width: `${scorePercent}%` }}
            />
          </div>
        </div>

        {/* Expandable chunk text */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex w-full items-center gap-1 text-xs text-slate-400 hover:text-slate-300 transition-colors"
        >
          {expanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
          {expanded ? "Hide" : "Show"} chunk text
        </button>
        {expanded && (
          <div className="mt-2 rounded-lg bg-slate-900/50 p-3">
            <p className="whitespace-pre-wrap text-xs leading-relaxed text-slate-400">
              {source.text}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
