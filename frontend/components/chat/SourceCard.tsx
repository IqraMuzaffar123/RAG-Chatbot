"use client";

import { useState, useCallback } from "react";
import { FileText, Copy, Check } from "lucide-react";
import type { SourceInfo } from "@/lib/api";

interface SourceCardProps {
  source: SourceInfo;
  index: number;
  query?: string;
}

function getTypeFromName(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (ext === "pdf") return "PDF";
  if (ext === "docx") return "DOCX";
  return "TXT";
}

function getTypeColors(type: string): { bg: string; fg: string } {
  switch (type) {
    case "PDF":
      return { bg: "rgba(239,68,68,0.14)", fg: "#f87171" };
    case "DOCX":
      return { bg: "rgba(59,130,246,0.16)", fg: "#60a5fa" };
    default:
      return { bg: "rgba(148,163,184,0.14)", fg: "#94a3b8" };
  }
}

function getBarColor(score: number): string {
  if (score >= 0.8) return "#10b981";
  if (score >= 0.55) return "#f59e0b";
  return "#ef4444";
}

/** Split text into segments, marking which parts match query keywords. */
function highlightText(text: string, query?: string): React.ReactNode {
  if (!query || !query.trim()) return text;

  // Extract meaningful keywords (3+ chars, skip stop words)
  const stopWords = new Set([
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
    "her", "was", "one", "our", "out", "has", "his", "how", "its", "may",
    "who", "did", "get", "let", "say", "she", "too", "use", "what", "when",
    "where", "which", "with", "this", "that", "from", "have", "been", "will",
    "more", "about", "than", "them", "then", "into", "some", "such", "they",
  ]);
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3 && !stopWords.has(w));

  if (keywords.length === 0) return text;

  const pattern = new RegExp(`(${keywords.map(escapeRegex).join("|")})`, "gi");
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    if (keywords.some((kw) => part.toLowerCase() === kw)) {
      return (
        <mark
          key={i}
          style={{
            background: "rgba(6,182,212,0.2)",
            color: "#67e8f9",
            borderRadius: 3,
            padding: "0 2px",
          }}
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function SourceCard({ source, index, query }: SourceCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const scorePercent = Math.round(source.relevance_score * 100);
  const type = getTypeFromName(source.document_name);
  const { bg, fg } = getTypeColors(type);
  const barColor = getBarColor(source.relevance_score);

  const handleCopy = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(source.text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    },
    [source.text],
  );

  return (
    <div
      data-source-doc={source.document_name}
      data-source-page={source.page_number}
      onClick={() => setExpanded(!expanded)}
      className="cursor-pointer transition-all duration-[250ms] group"
      style={{
        position: "relative",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.07)",
        borderLeft: "3px solid transparent",
        borderImage: "linear-gradient(180deg, #10b981, #06b6d4) 1",
        borderImageSlice: "0 0 0 1",
        borderRadius: 14,
        padding: "14px 15px",
        backdropFilter: "blur(14px)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.15)";
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
        (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
      }}
    >
      {/* Copy button — top right, visible on hover */}
      <button
        onClick={handleCopy}
        className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer"
        style={{
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 7,
          padding: "5px 6px",
          color: copied ? "#10b981" : "#94a3b8",
        }}
        title="Copy chunk text"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>

      {/* Header: type icon + name + page */}
      <div className="flex items-center gap-2.5 mb-[11px]">
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: bg,
            color: fg,
          }}
        >
          <FileText className="w-4 h-4" />
        </span>
        <div className="flex-1 min-w-0">
          <div
            className="font-mono text-[15px] font-semibold text-slate-200 truncate"
            style={{ letterSpacing: "-0.01em" }}
          >
            {source.document_name}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span
              className="font-mono text-[13px] font-semibold text-slate-400"
              style={{
                background: "rgba(255,255,255,0.06)",
                padding: "2px 7px",
                borderRadius: 99,
              }}
            >
              p.{source.page_number}
            </span>
            <span className="font-mono text-[13px] text-slate-500">
              rerank {source.rerank_score.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Text preview with keyword highlighting */}
      <div
        className="text-[15px] text-slate-400 leading-[1.6] m-0"
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }
        }
      >
        {highlightText(source.text, query)}
      </div>

      {/* Relevance bar */}
      <div className="mt-[13px]">
        <div className="flex justify-between items-center mb-1.5">
          <span className="stat-label" style={{ fontSize: "13px" }}>
            Relevance
          </span>
          <span
            className="font-mono text-[15px] font-bold text-slate-200"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {scorePercent}%
          </span>
        </div>
        <div
          className="rounded-full overflow-hidden"
          style={{ height: 6, background: "rgba(255,255,255,0.06)" }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${scorePercent}%`,
              background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
