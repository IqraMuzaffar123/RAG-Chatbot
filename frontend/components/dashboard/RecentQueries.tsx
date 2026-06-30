"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";
import type { RecentQuery } from "@/lib/api";

interface RecentQueriesProps {
  queries: RecentQuery[];
}

function confidenceBadge(confidence: number) {
  const pct = (confidence * 100).toFixed(0) + "%";
  if (confidence >= 0.8) {
    return (
      <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-medium text-emerald-400">
        {pct}
      </span>
    );
  }
  if (confidence >= 0.5) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-medium text-amber-400">
        {pct}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-red-400/15 px-2 py-0.5 text-xs font-medium text-red-400">
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
  return `${days}d ago`;
}

export function RecentQueries({ queries }: RecentQueriesProps) {
  return (
    <Card className="border-0 bg-slate-800/60 ring-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <MessageSquare className="h-4 w-4 text-slate-400" />
          Recent Queries
        </CardTitle>
      </CardHeader>
      <CardContent>
        {queries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">
            No queries yet — try the chat.
          </p>
        ) : (
          <div className="space-y-3">
            {queries.map((q, i) => (
              <div
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg bg-slate-900/50 px-3 py-2.5"
              >
                <p className="min-w-0 flex-1 truncate text-sm text-slate-300">
                  {q.question.length > 60
                    ? q.question.slice(0, 60) + "..."
                    : q.question}
                </p>
                <div className="flex items-center gap-3">
                  {confidenceBadge(q.confidence)}
                  <span className="whitespace-nowrap text-xs text-slate-500">
                    {relativeTime(q.timestamp)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
