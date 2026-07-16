"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Layers, X } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchChunks, type ChunkInfo } from "@/lib/api";

interface ChunkViewerProps {
  docId: string;
  docName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChunkViewer({ docId, docName, isOpen, onClose }: ChunkViewerProps) {
  const [chunks, setChunks] = useState<ChunkInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const perPage = 10;

  useEffect(() => {
    if (!isOpen || !docId) return;

    setLoading(true);
    fetchChunks(docId, page, perPage)
      .then((res) => {
        setChunks(res.chunks);
        setTotal(res.total);
      })
      .catch(() => {
        setChunks([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [isOpen, docId, page]);

  useEffect(() => {
    if (isOpen) setPage(1);
  }, [isOpen]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: "rgba(3,5,10,0.72)",
        backdropFilter: "blur(6px)",
        padding: 32,
        animation: "ad-fadein 0.2s ease",
      }}
      onClick={onClose}
    >
      <div
        className="w-full flex flex-col overflow-hidden"
        style={{
          maxWidth: 760,
          maxHeight: "86vh",
          background: "linear-gradient(180deg, #0d1320, #0a0f1a)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 18,
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between shrink-0"
          style={{
            padding: "18px 22px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          <div className="flex items-center gap-[11px] min-w-0">
            <span
              className="flex items-center justify-center shrink-0"
              style={{
                width: 34,
                height: 34,
                borderRadius: 9,
                background: "rgba(16,185,129,0.12)",
                color: "#34d399",
              }}
            >
              <Layers className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="font-mono text-[14.5px] font-semibold text-slate-50 truncate">
                {docName}
              </div>
              <div className="text-[11.5px] text-slate-500 mt-0.5">
                {total} chunks · page {page} of {totalPages}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center shrink-0 cursor-pointer transition-colors hover:text-slate-50 hover:bg-white/10"
            style={{
              width: 32,
              height: 32,
              color: "#94a3b8",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 9,
            }}
          >
            <X className="w-[17px] h-[17px]" />
          </button>
        </div>

        {/* Chunk list */}
        <div
          className="flex-1 overflow-y-auto flex flex-col gap-3"
          style={{ padding: "18px 22px" }}
        >
          {loading
            ? Array.from({ length: 3 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="h-32 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)" }}
                />
              ))
            : chunks.map((chunk) => (
                <div
                  key={chunk.chunk_id}
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 12,
                    padding: "14px 16px",
                  }}
                >
                  <div className="flex items-center gap-2 mb-[9px]">
                    <span
                      className="font-mono text-[10.5px] font-bold"
                      style={{
                        color: "#5eead4",
                        background: "rgba(16,185,129,0.1)",
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      #{chunk.chunk_index}
                    </span>
                    <span
                      className="text-[10.5px] text-slate-500"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        padding: "2px 8px",
                        borderRadius: 6,
                      }}
                    >
                      page {chunk.page_number}
                    </span>
                    <span className="font-mono text-[10.5px] text-slate-500 ml-auto">
                      {chunk.token_count} tokens
                    </span>
                  </div>
                  <p className="text-[12.5px] text-slate-400 leading-[1.65] m-0 whitespace-pre-wrap">
                    {chunk.text}
                  </p>
                </div>
              ))}
        </div>

        {/* Pagination footer */}
        {totalPages > 1 && (
          <div
            className="flex items-center justify-between shrink-0"
            style={{
              padding: "14px 22px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex items-center gap-[5px] text-[12.5px] font-medium cursor-pointer transition-colors"
              style={{
                color: page > 1 ? "#cbd5e1" : "#475569",
                background:
                  page > 1 ? "rgba(255,255,255,0.05)" : "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "8px 13px",
                borderRadius: 9,
              }}
            >
              <ChevronLeft className="w-[15px] h-[15px]" />
              Previous
            </button>
            <span className="font-mono text-[12px] text-slate-500">
              {page} / {totalPages}
            </span>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex items-center gap-[5px] text-[12.5px] font-medium cursor-pointer transition-colors"
              style={{
                color: page < totalPages ? "#cbd5e1" : "#475569",
                background:
                  page < totalPages ? "rgba(255,255,255,0.05)" : "transparent",
                border: "1px solid rgba(255,255,255,0.08)",
                padding: "8px 13px",
                borderRadius: 9,
              }}
            >
              Next
              <ChevronRight className="w-[15px] h-[15px]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
