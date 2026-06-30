"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Hash, FileText } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const totalPages = Math.ceil(total / perPage);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col bg-slate-800 text-slate-100 ring-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <FileText className="h-4 w-4 text-slate-400" />
            {docName}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {total} chunk{total !== 1 ? "s" : ""} total
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto max-h-[60vh] pr-2">
          <div className="space-y-3">
            {loading
              ? Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className="h-32 rounded-lg bg-slate-700/50"
                  />
                ))
              : chunks.map((chunk) => (
                  <div
                    key={chunk.chunk_id}
                    className="rounded-lg border border-slate-700 bg-slate-900/50 p-4"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="border-slate-600 text-slate-300"
                      >
                        <Hash className="mr-0.5 h-3 w-3" />
                        {chunk.chunk_index}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-slate-600 text-slate-400"
                      >
                        Page {chunk.page_number}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-slate-600 text-slate-400"
                      >
                        {chunk.token_count} tokens
                      </Badge>
                    </div>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                      {chunk.text}
                    </p>
                  </div>
                ))}
          </div>
        </ScrollArea>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-700 pt-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Prev
            </Button>
            <span className="text-sm text-slate-400">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
