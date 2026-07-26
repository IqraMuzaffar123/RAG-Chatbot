"use client";

import { useEffect, useRef } from "react";
import { Brain, BookOpen, Sparkles, ArrowUpRight } from "lucide-react";
import { SourceCard } from "./SourceCard";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { CopyButton } from "./CopyButton";
import type { SourceInfo } from "@/lib/api";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  sources?: SourceInfo[];
  confidence?: number | null;
  showInlineSources?: boolean;
  onSend?: (message: string) => void;
  onCitationClick?: (documentName: string, pageNumber: number) => void;
  maxWidth?: number;
}

const EXAMPLE_QUESTIONS = [
  "What are the steps to form an LLC?",
  "How do I get an EIN from the IRS?",
  "What is a registered agent?",
  "Compare sole proprietorship vs LLC",
  "What licenses do I need for a business?",
  "Explain business compliance requirements",
];

function renderContent(
  text: string,
  onCitationClick?: (documentName: string, pageNumber: number) => void
) {
  const lines = text.split("\n");
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\[Source:[^\]]+\]|\[[^\]]+\])/g);
    const processed = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={j} className="font-semibold text-slate-50">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={j}
            className="rounded px-1 py-0.5 text-xs text-emerald-300"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("[Source:") || (part.startsWith("[") && part.endsWith("]"))) {
        // Parse citation: [Source: filename, p.X] or [Source: filename, p. X]
        const citationText = part.slice(1, -1);
        const match = citationText.match(/Source:\s*(.+?),\s*p\.?\s*(\d+)/);
        return (
          <span
            key={j}
            className="cursor-pointer font-medium whitespace-nowrap transition-colors hover:text-cyan-300"
            onClick={() => {
              if (match && onCitationClick) {
                onCitationClick(match[1].trim(), parseInt(match[2]));
              }
            }}
            style={{
              color: "#22d3ee",
              textDecoration: "underline",
              textUnderlineOffset: "3px",
              textDecorationColor: "rgba(34,211,238,0.45)",
            }}
          >
            {citationText}
          </span>
        );
      }
      return part;
    });

    return (
      <span key={i}>
        {processed}
        {i < lines.length - 1 && <br />}
      </span>
    );
  });
}

export function ChatMessages({
  messages,
  isLoading,
  sources,
  confidence,
  showInlineSources,
  onSend,
  onCitationClick,
  maxWidth = 760,
}: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Welcome state — no messages
  if (messages.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto" style={{ padding: 26 }}>
        <div style={{ maxWidth, margin: "0 auto", width: "100%" }}>
          <div className="flex flex-col items-center text-center" style={{ padding: "48px 20px 30px" }}>
            {/* Brain icon */}
            <span
              className="flex items-center justify-center animate-in"
              style={{
                width: 76,
                height: 76,
                borderRadius: 22,
                background: "linear-gradient(140deg, rgba(16,185,129,0.18), rgba(6,182,212,0.12))",
                color: "#34d399",
                boxShadow: "0 10px 40px rgba(16,185,129,0.2)",
              }}
            >
              <Brain className="w-[38px] h-[38px]" />
            </span>

            <h2 className="text-[24px] font-bold tracking-tight text-slate-50 mt-[22px] m-0 animate-in delay-1">
              Ask your documents anything
            </h2>
            <p className="text-[16px] text-slate-400 mt-2 leading-[1.55] m-0 animate-in delay-2" style={{ maxWidth: 410 }}>
              AI-powered answers with citations and confidence scores
            </p>

            {/* Example question chips — 2x3 grid */}
            <div className="grid grid-cols-2 gap-[9px] mt-[26px] w-full" style={{ maxWidth: 520 }}>
              {EXAMPLE_QUESTIONS.map((q, idx) => (
                <button
                  key={q}
                  onClick={() => onSend?.(q)}
                  className={`flex items-center gap-[10px] text-left cursor-pointer transition-all duration-150 hover:border-emerald-500/40 hover:bg-emerald-500/[0.06] hover:text-slate-200 animate-in delay-${Math.min(idx + 3, 6)}`}
                  style={{
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 12,
                    fontSize: "16px",
                    color: "#cbd5e1",
                  }}
                >
                  <Sparkles className="w-[14px] h-[14px] text-teal-300 shrink-0" />
                  <span className="flex-1 min-w-0">{q}</span>
                  <ArrowUpRight className="w-[14px] h-[14px] text-slate-600 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ padding: 26 }}>
      <div style={{ maxWidth, margin: "0 auto", width: "100%" }}>
        {messages.map((msg, i) => {
          if (msg.role === "user") {
            return (
              <div key={i} className="flex justify-end mb-[22px] animate-in">
                <div
                  className="text-[16px] leading-[1.5] text-white"
                  style={{
                    maxWidth: "70%",
                    background: "linear-gradient(135deg, #059669, #10b981)",
                    padding: "11px 15px",
                    borderRadius: "16px 16px 4px 16px",
                    boxShadow: "0 4px 16px rgba(16,185,129,0.2)",
                  }}
                >
                  {msg.content}
                </div>
              </div>
            );
          }

          // Assistant message
          const isLastAssistant =
            i === messages.length - 1 && msg.role === "assistant";
          const isStreaming = isLastAssistant && isLoading;
          const isDone = isLastAssistant && !isLoading && msg.content.length > 0;
          const isError = msg.content.startsWith("Error:");

          return (
            <div key={i} className="mb-[26px] animate-in">
              {/* AI header */}
              <div className="flex items-center gap-2 mb-[9px]">
                <span
                  className="flex items-center justify-center"
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 7,
                    background: "rgba(16,185,129,0.14)",
                    color: "#34d399",
                  }}
                >
                  <Brain className="w-[15px] h-[15px]" />
                </span>
                <span className="text-[14px] font-semibold text-slate-200">
                  AskDocs
                </span>
                {isDone && confidence != null && (
                  <ConfidenceBadge confidence={confidence} />
                )}
              </div>

              {/* AI bubble */}
              <div
                className="group relative text-[16px] text-slate-300"
                style={{
                  maxWidth: "85%",
                  background: isError
                    ? "rgba(239,68,68,0.08)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${isError ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.06)"}`,
                  padding: "14px 16px",
                  borderRadius: "4px 16px 16px 16px",
                }}
              >
                {/* Copy button */}
                {isDone && !isError && <CopyButton text={msg.content} />}

                {/* Empty + loading = bouncing dots */}
                {msg.content.length === 0 && isLoading && (
                  <div className="flex gap-[5px] py-[3px]">
                    {[0, 0.2, 0.4].map((delay, di) => (
                      <span
                        key={di}
                        className="rounded-full"
                        style={{
                          width: 7,
                          height: 7,
                          background: "#10b981",
                          animation: `ad-dot 1.2s ease-in-out ${delay}s infinite`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Streaming text with blinking cursor */}
                {msg.content.length > 0 && isStreaming && (
                  <div className="leading-[1.65] whitespace-pre-wrap">
                    {renderContent(msg.content, onCitationClick)}
                    <span
                      className="inline-block align-text-bottom ml-0.5"
                      style={{
                        width: 7,
                        height: 14,
                        background: "#10b981",
                        animation: "ad-blink 1s step-end infinite",
                      }}
                    />
                  </div>
                )}

                {/* Done */}
                {msg.content.length > 0 && !isStreaming && (
                  <div className="leading-[1.65] whitespace-pre-wrap" style={{ color: isError ? "#f87171" : undefined }}>
                    {renderContent(msg.content, onCitationClick)}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Inline sources (Focus mode) */}
        {showInlineSources && sources && sources.length > 0 && (
          <div className="mt-0.5 mb-2" style={{ maxWidth: "90%" }}>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-teal-300" />
              <span className="stat-label">Sources</span>
              {confidence != null && (
                <ConfidenceBadge confidence={confidence} />
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {sources.map((source, si) => (
                <SourceCard key={source.chunk_id} source={source} index={si} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
