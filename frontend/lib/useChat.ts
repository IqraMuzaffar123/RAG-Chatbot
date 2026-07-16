"use client";

import { useCallback, useState } from "react";
import { chatStream, type SourceInfo, type ConversationMessage } from "@/lib/api";
import type { ChatMessage } from "@/components/chat/ChatMessages";

interface UseChatReturn {
  messages: ChatMessage[];
  sources: SourceInfo[];
  confidence: number | null;
  isLoading: boolean;
  sendMessage: (question: string) => void;
  resetChat: () => void;
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  setSources: React.Dispatch<React.SetStateAction<SourceInfo[]>>;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (question: string) => {
    // Build conversation history from last 5 exchanges (10 messages)
    const history: ConversationMessage[] = [];
    const prevMessages = messages.slice(); // snapshot current messages
    const recentPairs = prevMessages.slice(-10);
    for (const msg of recentPairs) {
      if (msg.content && (msg.role === "user" || msg.role === "assistant")) {
        history.push({ role: msg.role, content: msg.content });
      }
    }

    // Add user message
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsLoading(true);
    setSources([]);
    setConfidence(null);

    // Add empty assistant message that we'll stream into
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const response = await chatStream(question, 5, true, history);

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

        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();

          if (!trimmed) {
            currentEvent = "";
            continue;
          }

          if (trimmed.startsWith("event: ")) {
            currentEvent = trimmed.slice(7);
            continue;
          }

          if (!trimmed.startsWith("data: ")) continue;

          const data = trimmed.slice(6);
          if (data === "[DONE]") continue;

          if (currentEvent === "sources") {
            try {
              const sources = JSON.parse(data);
              setSources(sources);
            } catch {
              // ignore malformed sources
            }
          } else if (currentEvent === "token") {
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
  }, [messages]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setSources([]);
    setConfidence(null);
    setIsLoading(false);
  }, []);

  return { messages, sources, confidence, isLoading, sendMessage, resetChat, setMessages, setSources };
}
