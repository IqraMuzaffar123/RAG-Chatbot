"use client";

import { useState, useMemo } from "react";
import { Eye, Trash2, FolderOpen, FileText, Search, ArrowUp, ArrowDown, Layers, HardDrive } from "lucide-react";
import type { DocumentInfo } from "@/lib/api";

interface DocumentTableProps {
  documents: DocumentInfo[];
  onViewChunks: (doc: DocumentInfo) => void;
  onDelete: (doc: DocumentInfo) => void;
}

const typeFilters = ["ALL", "PDF", "DOCX", "TXT"] as const;

type SortKey = "filename" | "file_type" | "num_chunks" | "file_size_bytes" | "uploaded_at";
type SortDir = "asc" | "desc";

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

function SortIcon({ column, sortKey, sortDir }: { column: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (column !== sortKey) return null;
  return sortDir === "asc"
    ? <ArrowUp className="w-3 h-3 inline ml-1 text-emerald-400" />
    : <ArrowDown className="w-3 h-3 inline ml-1 text-emerald-400" />;
}

export function DocumentTable({ documents, onViewChunks, onDelete }: DocumentTableProps) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("uploaded_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "filename" || key === "file_type" ? "asc" : "desc");
    }
  };

  const filtered = useMemo(() => {
    let result = documents;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((d) => d.filename.toLowerCase().includes(q));
    }
    if (typeFilter !== "ALL") {
      result = result.filter((d) => d.file_type.toLowerCase() === typeFilter.toLowerCase());
    }
    const sorted = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "filename":
          cmp = a.filename.localeCompare(b.filename);
          break;
        case "file_type":
          cmp = a.file_type.localeCompare(b.file_type);
          break;
        case "num_chunks":
          cmp = a.num_chunks - b.num_chunks;
          break;
        case "file_size_bytes":
          cmp = a.file_size_bytes - b.file_size_bytes;
          break;
        case "uploaded_at":
          cmp = new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [documents, search, typeFilter, sortKey, sortDir]);

  if (documents.length === 0) {
    return (
      <div className="gradient-card mt-4 overflow-hidden">
        <div className="flex flex-col items-center justify-center py-16">
          <FolderOpen className="mb-3 h-10 w-10 text-slate-600" />
          <p className="text-[15px] font-medium text-slate-400">
            No documents uploaded yet
          </p>
          <p className="mt-1 text-[14px] text-slate-500">
            Upload documents above to get started
          </p>
        </div>
      </div>
    );
  }

  const colHeaderStyle: React.CSSProperties = {
    cursor: "pointer",
    userSelect: "none",
  };

  return (
    <div className="mt-4">
      {/* Search & Filter Bar */}
      <div className="flex items-center gap-2 mb-3 animate-in delay-2 flex-wrap">
        <div
          className="flex items-center gap-2.5 flex-1 min-w-[200px]"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 10,
            padding: "10px 14px",
          }}
        >
          <Search className="w-5 h-5 text-slate-500 shrink-0" />
          <input
            type="text"
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-[17px] text-slate-200 placeholder:text-slate-500 outline-none border-none"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {typeFilters.map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className="cursor-pointer text-[15px] font-semibold uppercase tracking-wider transition-all duration-150"
              style={{
                padding: "9px 16px",
                borderRadius: 8,
                background: typeFilter === f ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${typeFilter === f ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.06)"}`,
                color: typeFilter === f ? "#34d399" : "#94a3b8",
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Table Card */}
      <div className="gradient-card overflow-hidden animate-in delay-3">
        {/* Header */}
        <div
          className="flex items-center justify-between"
          style={{
            padding: "14px 20px",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <span className="text-[18px] font-semibold text-slate-50">
            All Documents{" "}
            <span className="font-mono text-slate-500 font-normal">
              ({filtered.length})
            </span>
          </span>
        </div>

        {/* Desktop Column headers (hidden on mobile) */}
        <div
          className="items-center hidden lg:grid"
          style={{
            gridTemplateColumns: "2.4fr 0.8fr 0.7fr 0.8fr 1fr 0.7fr",
            padding: "12px 20px",
            background: "rgba(255,255,255,0.02)",
            borderBottom: "1px solid rgba(255,255,255,0.05)",
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "#94a3b8",
            fontWeight: 600,
          }}
        >
          <span style={colHeaderStyle} onClick={() => handleSort("filename")}>
            Filename <SortIcon column="filename" sortKey={sortKey} sortDir={sortDir} />
          </span>
          <span style={colHeaderStyle} onClick={() => handleSort("file_type")}>
            Type <SortIcon column="file_type" sortKey={sortKey} sortDir={sortDir} />
          </span>
          <span style={colHeaderStyle} onClick={() => handleSort("num_chunks")}>
            Chunks <SortIcon column="num_chunks" sortKey={sortKey} sortDir={sortDir} />
          </span>
          <span style={colHeaderStyle} onClick={() => handleSort("file_size_bytes")}>
            Size <SortIcon column="file_size_bytes" sortKey={sortKey} sortDir={sortDir} />
          </span>
          <span style={colHeaderStyle} onClick={() => handleSort("uploaded_at")}>
            Uploaded <SortIcon column="uploaded_at" sortKey={sortKey} sortDir={sortDir} />
          </span>
          <span className="text-right">Actions</span>
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-[15px] text-slate-500">No documents match your search</p>
          </div>
        ) : (
          filtered.map((doc) => (
            <div key={doc.id}>
              {/* Desktop row (hidden on mobile) */}
              <div
                className="hidden lg:grid items-center transition-colors duration-150 hover:bg-white/[0.04]"
                style={{
                  gridTemplateColumns: "2.4fr 0.8fr 0.7fr 0.8fr 1fr 0.7fr",
                  padding: "14px 20px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <FileText
                    className="w-[18px] h-[18px] shrink-0"
                    style={{ color: getTypeColor(doc.file_type) }}
                  />
                  <span className="font-mono text-[17px] text-slate-200 truncate">
                    {doc.filename}
                  </span>
                </span>
                <span>
                  <span className={getTypeBadgeClass(doc.file_type)}>
                    {doc.file_type.toUpperCase()}
                  </span>
                </span>
                <span className="font-mono text-[16px] text-slate-400">
                  {doc.num_chunks}
                </span>
                <span className="font-mono text-[16px] text-slate-400">
                  {formatSize(doc.file_size_bytes)}
                </span>
                <span className="text-[16px] text-slate-500">
                  {formatRelativeTime(doc.uploaded_at)}
                </span>
                <span className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onViewChunks(doc)}
                    className="flex items-center gap-1.5 text-[15px] text-slate-400 font-medium cursor-pointer transition-colors hover:text-slate-200"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      padding: "7px 12px",
                      borderRadius: 8,
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    Chunks
                  </button>
                  <button
                    onClick={() => onDelete(doc)}
                    className="flex items-center justify-center cursor-pointer transition-colors text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                    style={{
                      width: 34,
                      height: 34,
                      background: "transparent",
                      border: "1px solid transparent",
                      borderRadius: 8,
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </span>
              </div>

              {/* Mobile card row (hidden on desktop) */}
              <div
                className="lg:hidden flex items-center justify-between transition-colors duration-150 hover:bg-white/[0.04]"
                style={{
                  padding: "14px 16px",
                  borderBottom: "1px solid rgba(255,255,255,0.04)",
                }}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <FileText
                    className="w-[20px] h-[20px] shrink-0"
                    style={{ color: getTypeColor(doc.file_type) }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[17px] text-slate-200 truncate">
                        {doc.filename}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[15px] text-slate-500">
                      <span className={getTypeBadgeClass(doc.file_type)}>
                        {doc.file_type.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {doc.num_chunks} chunks
                      </span>
                      <span className="flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5" />
                        {formatSize(doc.file_size_bytes)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                  <button
                    onClick={() => onViewChunks(doc)}
                    className="flex items-center gap-1.5 text-[15px] text-slate-400 font-medium cursor-pointer transition-colors hover:text-slate-200"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.07)",
                      padding: "7px 12px",
                      borderRadius: 8,
                    }}
                  >
                    <Eye className="w-4 h-4" />
                    Chunks
                  </button>
                  <button
                    onClick={() => onDelete(doc)}
                    className="flex items-center justify-center cursor-pointer transition-colors text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                    style={{
                      width: 34,
                      height: 34,
                      background: "transparent",
                      border: "1px solid transparent",
                      borderRadius: 8,
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
