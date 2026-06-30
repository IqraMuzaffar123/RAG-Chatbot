"use client";

import { Eye, Trash2, FolderOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DocumentInfo } from "@/lib/api";

interface DocumentTableProps {
  documents: DocumentInfo[];
  onViewChunks: (doc: DocumentInfo) => void;
  onDelete: (doc: DocumentInfo) => void;
}

function getTypeBadgeClasses(type: string): string {
  switch (type.toLowerCase()) {
    case "pdf":
      return "bg-red-500/15 text-red-400 border-red-500/20";
    case "docx":
      return "bg-blue-500/15 text-blue-400 border-blue-500/20";
    case "txt":
      return "bg-slate-500/15 text-slate-400 border-slate-500/20";
    default:
      return "bg-slate-500/15 text-slate-400 border-slate-500/20";
  }
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function DocumentTable({ documents, onViewChunks, onDelete }: DocumentTableProps) {
  if (documents.length === 0) {
    return (
      <Card className="border-0 bg-slate-800/60 ring-white/5">
        <CardContent className="flex flex-col items-center justify-center py-16">
          <FolderOpen className="mb-3 h-10 w-10 text-slate-500" />
          <p className="text-sm font-medium text-slate-400">
            No documents uploaded yet
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Upload documents above to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-slate-800/60 ring-white/5">
      <CardHeader>
        <CardTitle className="text-white">
          All Documents
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({documents.length})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-slate-700 hover:bg-transparent">
              <TableHead className="text-slate-400">Filename</TableHead>
              <TableHead className="text-slate-400">Type</TableHead>
              <TableHead className="text-slate-400">Chunks</TableHead>
              <TableHead className="text-slate-400">Uploaded</TableHead>
              <TableHead className="text-right text-slate-400">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map((doc) => (
              <TableRow key={doc.id} className="border-slate-700/50">
                <TableCell className="font-medium text-slate-200">
                  {doc.filename}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={getTypeBadgeClasses(doc.file_type)}
                  >
                    {doc.file_type.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-slate-300">{doc.num_chunks}</TableCell>
                <TableCell className="text-slate-400">
                  {formatRelativeTime(doc.uploaded_at)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-slate-400 hover:text-white"
                      onClick={() => onViewChunks(doc)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-slate-400 hover:text-red-400"
                      onClick={() => onDelete(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
