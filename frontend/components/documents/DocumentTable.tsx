"use client";

import { useState, useMemo } from "react";
import { Eye, Trash2, FolderOpen, FileText, Search } from "lucide-react";
import type { DocumentInfo } from "@/lib/api";

interface DocumentTableProps {
  documents: DocumentInfo[];
  onViewChunks: (doc: DocumentInfo) => void;
  onDelete: (doc: DocumentInfo) => void;
}

const typeFilters = ["ALL", "PDF", "DOCX", "TXT"] as const;

function getTypeColor(type: string): string {
  switch (type.toLowerCase()) {
    case "pdf": return "#f87171";
    case "docx": return "#60a5fa";
    default: return "#94a3b8";
  }
}

function getTypeBadgeClass(type: string): string {
  switch (type.toLowerCase()) {
    case "pdf": return "type-badge type-badge-pdf";
    case "docx": return "type-badge type-badge-docx";
    default: return "type-badge type-badge-txt";
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(0) + " KB";
}

export function DocumentTable({ documents, onViewChunks, onDelete }: DocumentTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const filtered = useMemo(() => {
    let result = documents;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((d) => d.filename.toLowerCase().includes(q));
    }
    if (typeFilter !== "ALL") {
      result = result.filter((d) => d.file_type.toLowerCase() === typeFilter.toLowerCase());
    }
    return result;
  }, [documents, search, typeFilter]);

  if (documents.length === 0) {
    return (
      <div className="gradient-card mt-5 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16">
          <FolderOpen className="mb-3 h-10 w-10 text-slate-600" />
          <p className="text-sm font-medium text-slate-400">
            No documents uploaded yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Upload documents above to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5">
      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 mb-3 animate-in delay-2">
        <div
          className="flex items-center gap-2 flex-1"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: "8px 12px",
          }}
        >
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[14px] text-slate-200 placeholder:text-slate-600 outline-none border-none"
          />
        </div>
        <div className="flex items-center gap-1">
          {typeFilters.map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className="cursor-pointer text-[11px] font-semibold uppercase tracking-wider transition-all duration-150"
              style={{
                padding: "7px 12px",
                borderRadius: 8,
                background: typeFilter === f ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${typeFilter === f ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: typeFilter === f ? "#34d399" : "#64748b",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="gradient-card overflow-hidden animate-in delay-3">
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: "15px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span className="text-[14px] font-semibold text-slate-50">
            All Documents{" "}
            <span className="font-mono text-slate-500 font-normal">
              ({filtered.length})
            </span>
          </span>
        </div>

        {/* Column headers */}
        <div
          className="grid items-center"
          style={{
            gridTemplateColumns: "2.4fr 0.8fr 0.7fr 0.8fr 1fr 0.7fr",
            padding: "11px 18px",
            background: "rgba(255,255,255,0.02)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            fontSize: 10,
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            color: "#64748b",
            fontWeight: 600,
          }}
        >
          <span>Filename</span>
          <span>Type</span>
          <span>Chunks</span>
          <span>Size</span>
          <span>Uploaded</span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-slate-500">No documents match your search</p>
          </div>
        ) : (
          filtered.map((doc) => (
            <div
              key={doc.id}
              className="grid items-center transition-colors duration-150 hover:bg-white/[0.03]"
              style={{
                gridTemplateColumns: "2.4fr 0.8fr 0.7fr 0.8fr 1fr 0.7fr",
                padding: "12px 18px",
                borderBottom: "1px solid rgba(255,255,255,0.035)",
              }}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <FileText
                  className="w-[17px] h-[17px] shrink-0"
                  style={{ color: getTypeColor(doc.file_type) }}
                />
                <span className="font-mono text-[13px] text-slate-200 truncate">
                  {doc.filename}
                </span>
              </span>
              <span>
                <span className={getTypeBadgeClass(doc.file_type)}>
                  {doc.file_type.toUpperCase()}
                </span>
              </span>
              <span className="font-mono text-[12.5px] text-slate-400">
                {doc.num_chunks}
              </span>
              <span className="font-mono text-[12.5px] text-slate-400">
                {formatSize(doc.file_size_bytes)}
              </span>
              <span className="text-[12px] text-slate-500">
                {formatRelativeTime(doc.uploaded_at)}
              </span>
              <span className="flex items-center justify-end gap-1">
                <button
                  onClick={() => onViewChunks(doc)}
                  className="flex items-center gap-[5px] text-[11.5px] text-slate-400 font-medium cursor-pointer transition-colors hover:text-slate-200"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    padding: "6px 10px",
                    borderRadius: 8,
                  }}
                >
                  <Eye className="w-[14px] h-[14px]" />
                  Chunks
                </button>
                <button
                  onClick={() => onDelete(doc)}
                  className="flex items-center justify-center cursor-pointer transition-colors text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                  style={{
                    width: 30,
                    height: 30,
                    background: "transparent",
                    border: "1px solid transparent",
                    borderRadius: 8,
                  }}
                >
                  <Trash2 className="w-[15px] h-[15px]" />
                </button>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
