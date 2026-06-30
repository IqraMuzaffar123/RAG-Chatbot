"use client";

import { ChatInput } from "@/components/chat/ChatInput";
import { ChatMessages } from "@/components/chat/ChatMessages";
import { SourcePanel } from "@/components/chat/SourcePanel";
import { useChat } from "@/lib/useChat";

export default function ChatPage() {
  const { messages, sources, confidence, isLoading, sendMessage } = useChat();

  return (
    <div className="-mx-6 -my-8 flex h-screen">
      {/* Chat panel — left 60% */}
      <div className="flex w-[60%] flex-col">
        {/* Header */}
        <div className="border-b border-slate-700 px-6 py-4">
          <h1 className="text-lg font-semibold text-white">Chat</h1>
          <p className="text-xs text-slate-400">
            Ask questions about your documents
          </p>
        </div>

        {/* Messages */}
        <ChatMessages messages={messages} />

        {/* Input */}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </div>

      {/* Source panel — right 40% */}
      <div className="w-[40%]">
        <SourcePanel sources={sources} confidence={confidence} />
      </div>
    </div>
  );
}
