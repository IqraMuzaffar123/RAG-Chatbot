"use client";

import { BookOpen } from "lucide-react";
import { SourceCard } from "./SourceCard";
import { ConfidenceBadge } from "./ConfidenceBadge";
import type { SourceInfo } from "@/lib/api";

interface SourcePanelProps {
  sources: SourceInfo[];
  confidence: number | null;
  query?: string;
}

export function SourcePanel({ sources, confidence, query }: SourcePanelProps) {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          padding: "16px 20px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div className="flex items-center gap-[9px]">
          <BookOpen className="w-4 h-4 text-teal-300" />
          <span className="text-[17px] font-semibold text-slate-50">
            Sources
          </span>
          {sources.length > 0 && (
            <span
              className="font-mono text-[14px] text-slate-500"
              style={{
                background: "rgba(255,255,255,0.06)",
                padding: "2px 8px",
                borderRadius: 99,
              }}
            >
              {sources.length}
            </span>
          )}
        </div>
        {confidence !== null && <ConfidenceBadge confidence={confidence} />}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto" style={{ padding: 16 }}>
        {sources.length === 0 ? (
          <div className="flex flex-col items-center text-center" style={{ padding: "70px 24px", color: "#475569" }}>
            <BookOpen className="w-[34px] h-[34px]" />
            <div className="text-[16px] text-slate-400 mt-3.5 font-medium">
              Sources will appear here
            </div>
            <div
              className="text-[14px] text-slate-500 mt-[5px] leading-[1.5]"
              style={{ maxWidth: 220 }}
            >
              Ask a question and the most relevant document chunks — with
              relevance scores — show up here.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sources.map((source, i) => (
              <SourceCard key={source.chunk_id} source={source} index={i} query={query} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
