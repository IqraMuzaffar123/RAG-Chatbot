"use client";

import { useCallback, useEffect, useState } from "react";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { ChunkViewer } from "@/components/documents/ChunkViewer";
import { DeleteDialog } from "@/components/documents/DeleteDialog";
import { ToastProvider, useToast } from "@/components/ui/Toast";
import {
  fetchDocuments,
  deleteDocument,
  type DocumentInfo,
} from "@/lib/api";

function DocumentsContent() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewingDoc, setViewingDoc] = useState<DocumentInfo | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<DocumentInfo | null>(null);
  const { showToast } = useToast();

  const loadDocuments = useCallback(async () => {
    try {
      setError(null);
      const res = await fetchDocuments();
      setDocuments(res.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const handleUploadComplete = useCallback(async () => {
    showToast("Documents uploaded successfully");
    await loadDocuments();
  }, [loadDocuments, showToast]);

  const handleDelete = async () => {
    if (!deletingDoc) return;
    try {
      await deleteDocument(deletingDoc.id);
      setDeletingDoc(null);
      showToast(`Deleted ${deletingDoc.filename}`);
      await loadDocuments();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Delete failed",
        "error"
      );
      setDeletingDoc(null);
    }
  };

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ padding: "24px 32px 36px" }}
    >
      {/* Header */}
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3 animate-in">
        <div>
          <h1 className="text-[32px] font-bold text-slate-50 m-0" style={{ letterSpacing: "-0.025em" }}>
            Documents
          </h1>
          <p className="mt-1 text-[17px] text-slate-400 m-0">
            Manage your knowledge base
          </p>
        </div>
        <span
          className="font-mono text-[16px] text-slate-300 font-medium"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            padding: "8px 16px",
            borderRadius: 99,
          }}
        >
          {documents.length} documents
        </span>
      </div>

      {/* Upload Zone */}
      <div className="animate-in delay-1">
        <UploadZone onUploadComplete={handleUploadComplete} />
      </div>

      {/* Error */}
      {error && (
        <div
          className="mt-4 rounded-2xl px-4 py-3 text-[15px] text-red-400"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          {error}
        </div>
      )}

      {/* Document Table */}
      {loading ? (
        <div className="mt-5 gradient-card" style={{ padding: "16px 18px" }}>
          <div className="skeleton" style={{ width: 140, height: 18, marginBottom: 16 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ padding: "10px 0" }}>
              <div className="skeleton" style={{ width: "90%", height: 14 }} />
            </div>
          ))}
        </div>
      ) : (
        <DocumentTable
          documents={documents}
          onViewChunks={(doc) => setViewingDoc(doc)}
          onDelete={(doc) => setDeletingDoc(doc)}
        />
      )}

      {/* Chunk Viewer Modal */}
      {viewingDoc && (
        <ChunkViewer
          docId={viewingDoc.id}
          docName={viewingDoc.filename}
          isOpen={!!viewingDoc}
          onClose={() => setViewingDoc(null)}
        />
      )}

      {/* Delete Confirmation */}
      {deletingDoc && (
        <DeleteDialog
          docName={deletingDoc.filename}
          numChunks={deletingDoc.num_chunks}
          isOpen={!!deletingDoc}
          onConfirm={handleDelete}
          onClose={() => setDeletingDoc(null)}
        />
      )}
    </div>
  );
}

export default function DocumentsPage() {
  return (
    <ToastProvider>
      <DocumentsContent />
    </ToastProvider>
  );
}
