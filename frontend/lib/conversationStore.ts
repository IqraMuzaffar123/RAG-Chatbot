import type { ChatMessage } from "@/components/chat/ChatMessages";
import type { SourceInfo } from "@/lib/api";

const STORAGE_KEY = "askdocs_conversations";
const MAX_CONVERSATIONS = 30;

export interface StoredConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  sources: SourceInfo[];
  createdAt: string;
  updatedAt: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getAll(): StoredConversation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveAll(conversations: StoredConversation[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function listConversations(): StoredConversation[] {
  return getAll().sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function loadConversation(id: string): StoredConversation | null {
  return getAll().find((c) => c.id === id) || null;
}

export function saveConversation(
  id: string | null,
  messages: ChatMessage[],
  sources: SourceInfo[]
): string {
  const conversations = getAll();
  const now = new Date().toISOString();

  // Generate title from first user message
  const firstUserMsg = messages.find((m) => m.role === "user");
  const title = firstUserMsg
    ? firstUserMsg.content.slice(0, 50) + (firstUserMsg.content.length > 50 ? "..." : "")
    : "New conversation";

  if (id) {
    // Update existing
    const idx = conversations.findIndex((c) => c.id === id);
    if (idx !== -1) {
      conversations[idx] = {
        ...conversations[idx],
        messages,
        sources,
        title,
        updatedAt: now,
      };
      saveAll(conversations);
      return id;
    }
  }

  // Create new
  const newId = generateId();
  conversations.push({
    id: newId,
    title,
    messages,
    sources,
    createdAt: now,
    updatedAt: now,
  });

  // Trim to max
  if (conversations.length > MAX_CONVERSATIONS) {
    conversations.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
    conversations.length = MAX_CONVERSATIONS;
  }

  saveAll(conversations);
  return newId;
}

export function deleteConversation(id: string) {
  const conversations = getAll().filter((c) => c.id !== id);
  saveAll(conversations);
}
