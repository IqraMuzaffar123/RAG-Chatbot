"use client";

import { useCallback, useState } from "react";
import { chatStream, type SourceInfo } from "@/lib/api";
import type { ChatMessage } from "@/components/chat/ChatMessages";

interface UseChatReturn {
  messages: ChatMessage[];
  sources: SourceInfo[];
  confidence: number | null;
  isLoading: boolean;
  sendMessage: (question: string) => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (question: string) => {
    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsLoading(true);
    setSources([]);
    setConfidence(null);

    // Add empty assistant message that we'll stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await chatStream(question);

      if (!response.body) {
        throw new Error("No response body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let currentEvent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process SSE lines — sse-starlette sends named events:
        //   event: sources\ndata: [...]\n\n
        //   event: token\ndata: hello\n\n
        //   event: metadata\ndata: {...}\n\n
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed) {
            // Empty line = end of SSE event block, reset
            currentEvent = "";
            continue;
          }

          if (trimmed.startsWith("event: ")) {
            currentEvent = trimmed.slice(7);
            continue;
          }

          if (!trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6); // Remove "data: "
          if (data === "[DONE]") continue;

          if (currentEvent === "sources") {
            try {
              const sources = JSON.parse(data);
              setSources(sources);
            } catch {
              // ignore malformed sources
            }
          } else if (currentEvent === "token") {
            // Token data is plain text, not JSON
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + data,
                };
              }
              return updated;
            });
          } else if (currentEvent === "metadata") {
            try {
              const metadata = JSON.parse(data);
              if (metadata.confidence !== undefined) {
                setConfidence(metadata.confidence);
              }
            } catch {
              // ignore malformed metadata
            }
          } else {
            // Fallback: no event type — treat as raw token
            setMessages((prev) => {
              const updated = [...prev];
              const last = updated[updated.length - 1];
              if (last && last.role === "assistant") {
                updated[updated.length - 1] = {
                  ...last,
                  content: last.content + data,
                };
              }
              return updated;
            });
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last && last.role === "assistant") {
          updated[updated.length - 1] = {
            ...last,
            content:
              err instanceof Error
                ? `Error: ${err.message}`
                : "An unexpected error occurred.",
          };
        }
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { messages, sources, confidence, isLoading, sendMessage };
}
