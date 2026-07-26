"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { SourcePanel } from "@/components/chat/SourcePanel";
import { useChat } from "@/lib/useChat";
import { saveConversation, loadConversation } from "@/lib/conversationStore";
import { Columns2, Square, RotateCcw } from "lucide-react";

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-full w-full flex items-center justify-center text-slate-500">Loading chat…</div>}>
      <ChatPageInner />
    </Suspense>
  );
}

function ChatPageInner() {
  const { messages, sources, confidence, isLoading, sendMessage, resetChat, setMessages, setSources } = useChat();
  const [layout, setLayout] = useState<"split" | "focus">("split");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const searchParams = useSearchParams();

  // Load conversation from URL param
  useEffect(() => {
    const cId = searchParams.get("c");
    if (cId) {
      const conv = loadConversation(cId);
      if (conv) {
        setMessages(conv.messages);
        setSources(conv.sources);
        setConversationId(cId);
      }
    }
  }, [searchParams, setMessages, setSources]);

  // Auto-save conversation on message changes
  useEffect(() => {
    if (messages.length > 0 && !isLoading) {
      const id = saveConversation(conversationId, messages, sources);
      if (!conversationId) setConversationId(id);
    }
  }, [messages, sources, isLoading, conversationId]);
  const sourcePanelRef = useRef<HTMLDivElement>(null);

  const isSplit = layout === "split";
  const hasMessages = messages.length > 0;

  // Get the last user query for keyword highlighting in sources
  const lastQuery = [...messages].reverse().find((m) => m.role === "user")?.content || "";

  const handleCitationClick = useCallback((documentName: string, pageNumber: number) => {
    if (!isSplit) setLayout("split");

    // Find and highlight the matching source card
    setTimeout(() => {
      const panel = sourcePanelRef.current;
      if (!panel) return;

      const cards = panel.querySelectorAll("[data-source-doc]");
      for (const card of cards) {
        const el = card as HTMLElement;
        if (
          el.dataset.sourceDoc === documentName ||
          el.dataset.sourceDoc?.includes(documentName)
        ) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          // Flash highlight
          el.style.borderColor = "#10b981";
          el.style.boxShadow = "0 0 20px rgba(16,185,129,0.3)";
          setTimeout(() => {
            el.style.borderColor = "";
            el.style.boxShadow = "";
          }, 2000);
          break;
        }
      }
    }, 100);
  }, [isSplit]);

  return (
    <div className="h-full w-full flex flex-col overflow-hidden">
      {/* Header bar */}
      <div
        className="flex items-center justify-between shrink-0"
        style={{
          padding: "16px 26px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <div>
          <div className="text-[18px] font-bold tracking-tight text-slate-50">
            Chat
          </div>
          <div className="text-[14px] text-slate-500 mt-0.5">
            Ask questions across your documents
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* New Chat button */}
          {hasMessages && (
            <button
              onClick={() => {
                resetChat();
                setConversationId(null);
                // Clear URL param
                window.history.replaceState({}, "", "/chat");
              }}
              className="flex items-center gap-1.5 text-[14px] font-semibold cursor-pointer transition-all duration-150 hover:border-emerald-500/30 hover:text-emerald-400"
              style={{
                padding: "7px 12px",
                borderRadius: 9,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#94a3b8",
              }}
            >
              <RotateCcw className="w-[13px] h-[13px]" />
              New Chat
            </button>
          )}

          {/* Layout toggle */}
          <div className="flex items-center gap-2">
            <span className="stat-label mr-0.5">Layout</span>
            <div
              className="flex gap-0.5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 10,
                padding: 3,
              }}
            >
              <button
                onClick={() => setLayout("split")}
                className="flex items-center gap-1.5 text-[14px] font-semibold cursor-pointer transition-colors"
                style={{
                  padding: "6px 11px",
                  borderRadius: 8,
                  border: "none",
                  background: isSplit ? "rgba(255,255,255,0.09)" : "transparent",
                  color: isSplit ? "#f1f5f9" : "#64748b",
                }}
              >
                <Columns2 className="w-[14px] h-[14px]" />
                Split
              </button>
              <button
                onClick={() => setLayout("focus")}
                className="flex items-center gap-1.5 text-[14px] font-semibold cursor-pointer transition-colors"
                style={{
                  padding: "6px 11px",
                  borderRadius: 8,
                  border: "none",
                  background: !isSplit ? "rgba(255,255,255,0.09)" : "transparent",
                  color: !isSplit ? "#f1f5f9" : "#64748b",
                }}
              >
                <Square className="w-[14px] h-[14px]" />
                Focus
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation column */}
        <div
          className="flex flex-col overflow-hidden min-w-0"
          style={{ flex: isSplit ? "1 1 60%" : "1 1 auto" }}
        >
          <ChatMessages
            messages={messages}
            isLoading={isLoading}
            sources={sources}
            confidence={confidence}
            showInlineSources={!isSplit && sources.length > 0}
            onSend={sendMessage}
            onCitationClick={handleCitationClick}
            maxWidth={isSplit ? 760 : 820}
          />
          <ChatInput
            onSend={sendMessage}
            disabled={isLoading}
            maxWidth={isSplit ? 760 : 820}
          />
        </div>

        {/* Source panel — right 40% in split mode */}
        {isSplit && (
          <div
            ref={sourcePanelRef}
            className="flex flex-col overflow-hidden shrink-0"
            style={{
              width: "40%",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(6,8,13,0.5)",
            }}
          >
            <SourcePanel sources={sources} confidence={confidence} query={lastQuery} />
          </div>
        )}
      </div>
    </div>
  );
}
