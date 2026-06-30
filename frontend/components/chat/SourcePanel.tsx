"use client";

import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SourceCard } from "./SourceCard";
import { ConfidenceBadge } from "./ConfidenceBadge";
import type { SourceInfo } from "@/lib/api";

interface SourcePanelProps {
  sources: SourceInfo[];
  confidence: number | null;
}

export function SourcePanel({ sources, confidence }: SourcePanelProps) {
  return (
    <div className="flex h-full flex-col border-l border-slate-700 bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-slate-400" />
          <span className="text-sm font-medium text-slate-200">Sources</span>
          {sources.length > 0 && (
            <Badge variant="secondary" className="bg-slate-700 text-slate-300">
              {sources.length}
            </Badge>
          )}
        </div>
        {confidence !== null && <ConfidenceBadge confidence={confidence} />}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          {sources.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="mb-3 h-8 w-8 text-slate-600" />
              <p className="text-sm text-slate-400">
                Ask a question to see sources
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Relevant document chunks will appear here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sources.map((source, i) => (
                <SourceCard key={source.chunk_id} source={source} index={i} />
              ))}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
