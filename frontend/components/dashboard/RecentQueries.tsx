"use client";

import { MessageSquare } from "lucide-react";
import type { RecentQuery } from "@/lib/api";

interface RecentQueriesProps {
  queries: RecentQuery[];
}

function confidenceBadge(confidence: number) {
  const pct = (confidence * 100).toFixed(0) + "%";
  if (confidence >= 0.8) {
    return (
      <span
        className="font-mono text-[11px] font-bold rounded-full"
        style={{
          color: "#34d399",
          background: "rgba(16,185,129,0.12)",
          padding: "3px 9px",
        }}
      >
        {pct}
      </span>
    );
  }
  if (confidence >= 0.5) {
    return (
      <span
        className="font-mono text-[11px] font-bold rounded-full"
        style={{
          color: "#fbbf24",
          background: "rgba(245,158,11,0.12)",
          padding: "3px 9px",
        }}
      >
        {pct}
      </span>
    );
  }
  return (
    <span
      className="font-mono text-[11px] font-bold rounded-full"
      style={{
        color: "#f87171",
        background: "rgba(239,68,68,0.12)",
        padding: "3px 9px",
      }}
    >
      {pct}
    </span>
  );
}

function relativeTime(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return "yesterday";
}

export function RecentQueries({ queries }: RecentQueriesProps) {
  return (
    <div
      className="glass-card overflow-hidden flex flex-col h-full"
      style={{ borderRadius: 16 }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div className="flex items-center gap-[9px]">
          <MessageSquare className="w-5 h-5 text-teal-300" />
          <span className="text-[16px] font-semibold text-slate-50">
            Recent Queries
          </span>
        </div>
      </div>

      {/* Rows */}
      <div className="flex-1">
        {queries.length === 0 ? (
          <div className="flex flex-col h-full">
            {/* Placeholder rows to fill space */}
            {[
              "What is a registered agent?",
              "Compare LLC vs S-Corp for tax purposes",
              "Annual report filing fees in Texas?",
              "How do I dissolve an LLC in Delaware?",
              "Do I need an EIN for a single-member LLC?",
              "What triggers foreign qualification?",
              "Steps to form a corporation",
              "Operating agreement requirements",
            ].map((q, i) => (
              <div
                key={i}
                className="flex items-center gap-3.5 opacity-20"
                style={{
                  padding: "14px 18px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <MessageSquare className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="flex-1 min-w-0 text-[14px] text-slate-500 truncate">{q}</span>
                <span className="font-mono text-[12px] font-bold rounded-full"
                  style={{ color: "#475569", background: "rgba(255,255,255,0.06)", padding: "3px 9px" }}>—</span>
                <span className="font-mono text-[12px] text-slate-600 shrink-0 w-[60px] text-right">—</span>
              </div>
            ))}
            <div className="flex items-center justify-center flex-1">
              <p className="text-[13px] text-slate-500">Ask a question in the chat to see results here</p>
            </div>
          </div>
        ) : (
          queries.map((q, i) => (
            <div
              key={i}
              className="flex items-center gap-3.5 transition-colors duration-150 hover:bg-white/[0.03]"
              style={{
                padding: "13px 18px",
                borderBottom:
                  i < queries.length - 1
                    ? "1px solid rgba(255,255,255,0.04)"
                    : undefined,
              }}
            >
              <MessageSquare className="w-4 h-4 text-slate-600 shrink-0" />
              <span className="flex-1 min-w-0 text-[14px] text-slate-300 truncate">
                {q.question}
              </span>
              {confidenceBadge(q.confidence)}
              <span className="font-mono text-[11px] text-slate-500 shrink-0 w-[66px] text-right">
                {relativeTime(q.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
