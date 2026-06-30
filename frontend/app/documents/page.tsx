"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { UploadZone } from "@/components/documents/UploadZone";
import { DocumentTable } from "@/components/documents/DocumentTable";
import { ChunkViewer } from "@/components/documents/ChunkViewer";
import { DeleteDialog } from "@/components/documents/DeleteDialog";
import {
  fetchDocuments,
  deleteDocument,
  type DocumentInfo,
} from "@/lib/api";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Chunk viewer state
  const [viewingDoc, setViewingDoc] = useState<DocumentInfo | null>(null);

  // Delete dialog state
  const [deletingDoc, setDeletingDoc] = useState<DocumentInfo | null>(null);

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

  const handleDelete = async () => {
    if (!deletingDoc) return;
    try {
      await deleteDocument(deletingDoc.id);
      setDeletingDoc(null);
      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setDeletingDoc(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Documents</h1>
        <p className="mt-1 text-sm text-slate-400">
          Upload and manage your knowledge base documents
        </p>
      </div>

      {/* Upload Zone */}
      <UploadZone onUploadComplete={loadDocuments} />

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Document Table */}
      {loading ? (
        <Skeleton className="h-64 rounded-xl bg-slate-800/60" />
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
