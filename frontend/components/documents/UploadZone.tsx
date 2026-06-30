"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { uploadDocuments, type UploadResponse } from "@/lib/api";

const ACCEPTED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const MAX_SIZE = 20 * 1024 * 1024; // 20MB

type UploadState = "idle" | "uploading" | "done" | "error";

interface UploadZoneProps {
  onUploadComplete: () => void;
}

export function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const [state, setState] = useState<UploadState>("idle");
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateFiles = useCallback((fileList: FileList | File[]): File[] => {
    const valid: File[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!ACCEPTED_TYPES.includes(file.type) && !ACCEPTED_EXTENSIONS.includes(ext)) {
        errors.push(`${file.name}: unsupported file type`);
      } else if (file.size > MAX_SIZE) {
        errors.push(`${file.name}: exceeds 20MB limit`);
      } else {
        valid.push(file);
      }
    });

    if (errors.length > 0) {
      setError(errors.join(". "));
    } else {
      setError(null);
    }

    return valid;
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const valid = validateFiles(e.dataTransfer.files);
      if (valid.length > 0) setFiles(valid);
    },
    [validateFiles]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const valid = validateFiles(e.target.files);
        if (valid.length > 0) setFiles(valid);
      }
    },
    [validateFiles]
  );

  const handleUpload = async () => {
    if (files.length === 0) return;
    setState("uploading");
    setError(null);

    try {
      const res = await uploadDocuments(files);
      setResult(res);
      setState("done");
      onUploadComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setFiles([]);
    setError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <Card className="border-0 bg-slate-800/60 ring-white/5">
      <CardContent>
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => state === "idle" && inputRef.current?.click()}
          className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 transition-colors cursor-pointer ${
            dragOver
              ? "border-emerald-500 bg-emerald-500/5"
              : state === "done"
              ? "border-emerald-500/30 bg-emerald-500/5"
              : state === "error"
              ? "border-red-500/30 bg-red-500/5"
              : "border-slate-600 hover:border-slate-500 hover:bg-slate-700/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />

          {state === "idle" && (
            <>
              <Upload className="mb-3 h-10 w-10 text-slate-400" />
              <p className="text-sm font-medium text-slate-300">
                Drag & drop files here, or click to browse
              </p>
              <p className="mt-1 text-xs text-slate-500">
                PDF, DOCX, TXT — max 20MB per file
              </p>
            </>
          )}

          {state === "uploading" && (
            <>
              <Loader2 className="mb-3 h-10 w-10 animate-spin text-emerald-400" />
              <p className="text-sm font-medium text-slate-300">
                Uploading & processing...
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Extracting text, chunking, and embedding
              </p>
            </>
          )}

          {state === "done" && result && (
            <>
              <CheckCircle2 className="mb-3 h-10 w-10 text-emerald-400" />
              <p className="text-sm font-medium text-emerald-300">
                Upload complete
              </p>
              <p className="mt-1 text-xs text-slate-400">
                {result.documents.length} document{result.documents.length !== 1 ? "s" : ""} processed
                {" — "}
                {result.documents.reduce((sum, d) => sum + d.num_chunks, 0)} chunks created
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-slate-400 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
              >
                Upload more
              </Button>
            </>
          )}

          {state === "error" && (
            <>
              <AlertCircle className="mb-3 h-10 w-10 text-red-400" />
              <p className="text-sm font-medium text-red-300">Upload failed</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 text-slate-400 hover:text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  reset();
                }}
              >
                Try again
              </Button>
            </>
          )}
        </div>

        {/* Error message */}
        {error && state !== "error" && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-red-500/10 px-3 py-2 text-xs text-red-400">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {/* Selected files list */}
        {files.length > 0 && state === "idle" && (
          <div className="mt-4 space-y-2">
            {files.map((file, i) => (
              <div
                key={`${file.name}-${i}`}
                className="flex items-center justify-between rounded-lg bg-slate-700/40 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-400" />
                  <span className="text-sm text-slate-300">{file.name}</span>
                  <span className="text-xs text-slate-500">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="rounded p-0.5 text-slate-500 hover:text-slate-300"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}

            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleUpload();
              }}
              className="mt-2 w-full bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Upload {files.length} file{files.length !== 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
