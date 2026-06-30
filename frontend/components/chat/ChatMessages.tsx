"use client";

import { useEffect, useRef } from "react";
import { Bot, User } from "lucide-react";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatMessagesProps {
  messages: ChatMessage[];
}

function renderContent(text: string) {
  // Simple markdown-like rendering: bold, inline code, line breaks
  const lines = text.split("\n");
  return lines.map((line, i) => {
    // Process bold (**text**)
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`|\[Source:[^\]]+\])/g);
    const processed = parts.map((part, j) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={j} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={j}
            className="rounded bg-slate-700 px-1 py-0.5 text-xs text-emerald-300"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      if (part.startsWith("[Source:")) {
        return (
          <span
            key={j}
            className="cursor-pointer rounded bg-emerald-500/10 px-1 py-0.5 text-xs text-emerald-400 hover:bg-emerald-500/20"
          >
            {part}
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

export function ChatMessages({ messages }: ChatMessagesProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <Bot className="mb-3 h-12 w-12 text-slate-600" />
        <p className="text-sm font-medium text-slate-400">
          Ask a question about your documents
        </p>
        <p className="mt-1 text-xs text-slate-500">
          DocMind will search your knowledge base and provide cited answers
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
      {messages.map((msg, i) => (
        <div
          key={i}
          className={`flex items-start gap-3 ${
            msg.role === "user" ? "flex-row-reverse" : ""
          }`}
        >
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              msg.role === "user"
                ? "bg-blue-500/15 text-blue-400"
                : "bg-slate-700 text-slate-300"
            }`}
          >
            {msg.role === "user" ? (
              <User className="h-4 w-4" />
            ) : (
              <Bot className="h-4 w-4" />
            )}
          </div>
          <div
            className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-blue-600/20 text-blue-100"
                : "bg-slate-800 text-slate-300"
            }`}
          >
            {msg.role === "assistant"
              ? renderContent(msg.content)
              : msg.content}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
}
