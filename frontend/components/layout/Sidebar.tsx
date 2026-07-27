"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  FolderOpen,
  MessageSquare,
  FileSearch,
  PanelLeftClose,
  PanelLeft,
  MessageCircle,
  X,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { listConversations, deleteConversation, type StoredConversation } from "@/lib/conversationStore";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/documents", label: "Documents", icon: FolderOpen },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/benchmarks", label: "Benchmarks", icon: BarChart3 },
];

interface SidebarProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function Sidebar({ collapsed: controlledCollapsed, onCollapsedChange }: SidebarProps) {
  const pathname = usePathname();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const [conversations, setConversations] = useState<StoredConversation[]>([]);

  // Use controlled or internal state
  const collapsed = controlledCollapsed ?? internalCollapsed;

  // Load collapsed state from localStorage on mount
  useEffect(() => {
    if (controlledCollapsed === undefined) {
      const saved = localStorage.getItem("askdocs_sidebar_collapsed");
      if (saved === "true") setInternalCollapsed(true);
    }
  }, [controlledCollapsed]);

  // Load recent conversations
  useEffect(() => {
    setConversations(listConversations().slice(0, 8));
  }, [pathname]);

  const handleDeleteConversation = (id: string) => {
    deleteConversation(id);
    setConversations(listConversations().slice(0, 8));
  };

  const toggleCollapsed = () => {
    const next = !collapsed;
    if (onCollapsedChange) {
      onCollapsedChange(next);
    } else {
      setInternalCollapsed(next);
    }
    localStorage.setItem("askdocs_sidebar_collapsed", String(next));
  };

  return (
    <aside
      className={cn(
        "flex flex-col shrink-0 h-screen transition-all duration-300 ease-in-out",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
      style={{
        padding: collapsed ? "22px 8px" : "22px 16px",
        borderRight: "1px solid rgba(255,255,255,0.06)",
        background:
          "linear-gradient(180deg, rgba(7,10,17,0.95), rgba(6,8,13,0.6))",
      }}
    >
      {/* Logo */}
      <div className={cn("flex items-center px-1.5 pb-1", collapsed ? "justify-center" : "gap-[11px]")}>
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: 11,
            background: "linear-gradient(140deg, #10b981, #059669)",
            color: "#04120c",
            boxShadow: "0 6px 20px rgba(16,185,129,0.35)",
          }}
        >
          <FileSearch className="w-[19px] h-[19px]" />
        </span>
        {!collapsed && (
          <div>
            <div className="text-[20px] font-bold tracking-tight leading-none text-white">
              AskDocs
            </div>
            <div className="text-[14px] text-slate-500 mt-1 whitespace-nowrap">
              Ask your documents anything
            </div>
          </div>
        )}
      </div>

      {/* Enterprise RAG badge */}
      {!collapsed && (
        <div className="mx-1.5 mt-3.5 mb-5">
          <span
            className="inline-flex items-center gap-[5px] whitespace-nowrap"
            style={{
              fontSize: "13px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: "#5eead4",
              background: "rgba(16,185,129,0.1)",
              border: "1px solid rgba(16,185,129,0.2)",
              padding: "5px 11px",
              borderRadius: 99,
            }}
          >
            Enterprise RAG
          </span>
        </div>
      )}

      {collapsed && <div className="mt-3.5 mb-5" />}

      {/* Navigation */}
      <nav className="flex flex-col gap-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-[10px] text-[17px] font-medium transition-all duration-150",
                collapsed ? "justify-center" : "gap-3 border-l-[3px]",
                isActive
                  ? collapsed
                    ? "text-teal-300 bg-emerald-500/10"
                    : "text-teal-300 bg-emerald-500/10 border-l-emerald-500"
                  : collapsed
                    ? "text-slate-500 hover:bg-white/[0.04] hover:text-slate-300"
                    : "text-slate-500 border-l-transparent hover:bg-white/[0.04] hover:text-slate-300"
              )}
              style={{ padding: collapsed ? "10px" : "10px 13px" }}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      {/* Recent Chats */}
      {!collapsed && conversations.length > 0 && (
        <div className="mt-5 flex-1 min-h-0 overflow-hidden flex flex-col">
          <div className="px-2 mb-2">
            <span
              style={{
                fontSize: "13px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: "#64748b",
              }}
            >
              Recent Chats
            </span>
          </div>
          <div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="group flex items-center gap-2 rounded-lg hover:bg-white/[0.04] transition-colors"
                style={{ padding: "7px 10px" }}
              >
                <MessageCircle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <Link
                  href={`/chat?c=${conv.id}`}
                  className="flex-1 min-w-0 text-[14px] text-slate-500 truncate hover:text-slate-300 transition-colors"
                  style={{ textDecoration: "none" }}
                >
                  {conv.title}
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all cursor-pointer shrink-0"
                  style={{ background: "none", border: "none", padding: 2 }}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom section */}
      <div className="mt-auto shrink-0">
        {/* Index status */}
        {!collapsed && (
          <div
            className="flex flex-col gap-2.5"
            style={{
              padding: 14,
              borderRadius: 12,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[15px] text-slate-400 font-medium">
                Index status
              </span>
              <span className="inline-flex items-center gap-[5px] text-[14px] font-semibold text-emerald-400">
                <span
                  className="rounded-full"
                  style={{
                    width: 7,
                    height: 7,
                    background: "#10b981",
                    boxShadow: "0 0 8px #10b981",
                    animation: "ad-pulse 2s ease-in-out infinite",
                  }}
                />
                Live
              </span>
            </div>
            <div
              style={{
                height: 1,
                background: "rgba(255,255,255,0.06)",
              }}
            />
            <div className="text-[14px] text-slate-500 leading-[1.5]">
              Hybrid BM25 + Vector
              <br />
              Cross-encoder re-rank · Citation-forced
            </div>
          </div>
        )}

        {/* Collapse toggle + version */}
        <div className={cn("flex items-center pt-3", collapsed ? "justify-center" : "justify-between px-1.5")}>
          {!collapsed && (
            <span className="text-[13px] text-slate-600">AskDocs v1.0</span>
          )}
          <button
            onClick={toggleCollapsed}
            className="text-slate-600 hover:text-slate-400 transition-colors p-1 rounded-md hover:bg-white/[0.04]"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <PanelLeft className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </aside>
  );
}
