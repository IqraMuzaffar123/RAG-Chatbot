"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp } from "lucide-react";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled: boolean;
  maxWidth?: number;
}

export function ChatInput({ onSend, disabled, maxWidth = 760 }: ChatInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSend = () => {
    const trimmed = value.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isActive = value.trim().length > 0;

  return (
    <div
      className="shrink-0"
      style={{
        padding: "16px 26px 22px",
        borderTop: "1px solid rgba(255,255,255,0.05)",
      }}
    >
      <div style={{ maxWidth, margin: "0 auto" }}>
        <div
          className="flex items-center gap-2.5"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 14,
            padding: "8px 8px 8px 16px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.3)",
          }}
        >
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your documents..."
            disabled={disabled}
            className="flex-1 bg-transparent border-none outline-none text-slate-50 text-[16px] placeholder:text-slate-500"
            style={{ fontFamily: "inherit" }}
          />
          <button
            onClick={handleSend}
            disabled={disabled || !isActive}
            className="flex items-center justify-center shrink-0 cursor-pointer transition-all duration-150"
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              border: "none",
              color: isActive ? "#04120c" : "#0a3a2c",
              background: isActive
                ? "linear-gradient(140deg, #10b981, #059669)"
                : "rgba(16,185,129,0.25)",
              opacity: isActive ? 1 : 0.6,
              boxShadow: isActive
                ? "0 4px 14px rgba(16,185,129,0.35)"
                : "none",
            }}
          >
            <ArrowUp className="w-[18px] h-[18px]" />
          </button>
        </div>
        <div className="text-center text-[13px] text-slate-600 mt-[9px]">
          Answers are grounded in your documents and cite their sources.
        </div>
      </div>
    </div>
  );
}
