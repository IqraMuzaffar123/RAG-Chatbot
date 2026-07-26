"use client";

import { useCallback, useRef, useState } from "react";
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle, X } from "lucide-react";
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

  // Idle drop zone
  if (state === "idle" && files.length === 0) {
    return (
      <>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-[180ms]"
          style={{
            padding: "20px 20px",
            borderRadius: 14,
            border: dragOver
              ? "2px dashed #10b981"
              : "2px dashed rgba(255,255,255,0.12)",
            background: dragOver
              ? "rgba(16,185,129,0.06)"
              : "rgba(255,255,255,0.015)",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload
            className="w-9 h-9 transition-colors duration-[180ms]"
            style={{ color: dragOver ? "#34d399" : "#475569" }}
          />
          <div className="text-[18px] font-semibold text-slate-200 mt-2.5">
            {dragOver ? "Drop to upload" : "Drag & drop files here"}
          </div>
          <div className="text-[16px] text-slate-400 mt-1">
            or{" "}
            <span className="text-teal-300 font-medium">click to browse</span>
          </div>
          <div className="font-mono text-[14px] text-slate-500 mt-2">
            PDF · DOCX · TXT — max 20MB per file
          </div>
        </div>

        {error && (
          <div
            className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-red-400"
            style={{ background: "rgba(239,68,68,0.08)" }}
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}
      </>
    );
  }

  // Files selected, idle — show file list + upload button
  if (state === "idle" && files.length > 0) {
    return (
      <>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-[180ms]"
          style={{
            padding: "20px 20px",
            borderRadius: 16,
            border: "2px dashed rgba(255,255,255,0.12)",
            background: "rgba(255,255,255,0.015)",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.txt"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Upload className="w-8 h-8 text-slate-500" />
          <div className="text-[15px] text-slate-400 mt-2">
            Add more files or{" "}
            <span className="text-teal-300 font-medium">browse</span>
          </div>
        </div>

        {error && (
          <div
            className="mt-3 flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] text-red-400"
            style={{ background: "rgba(239,68,68,0.08)" }}
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {files.map((file, i) => (
            <div
              key={`${file.name}-${i}`}
              className="flex items-center justify-between rounded-xl px-3 py-2"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-slate-400" />
                <span className="font-mono text-[15px] text-slate-300">
                  {file.name}
                </span>
                <span className="font-mono text-[13px] text-slate-500">
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

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleUpload();
            }}
            className="mt-2 w-full flex items-center justify-center gap-1.5 font-semibold text-[15px] py-[11px] rounded-xl cursor-pointer transition-colors"
            style={{
              background: "linear-gradient(140deg, #10b981, #059669)",
              color: "#04120c",
              border: "none",
              boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
            }}
          >
            <Upload className="w-4 h-4" />
            Upload {files.length} file{files.length !== 1 ? "s" : ""}
          </button>
        </div>
      </>
    );
  }

  // Uploading state
  if (state === "uploading") {
    return (
      <div
        className="flex flex-col gap-4"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(16,185,129,0.25)",
          borderRadius: 16,
          padding: "20px 22px",
        }}
      >
        <div className="text-[15px] font-semibold text-slate-200 flex items-center gap-2">
          <Loader2
            className="w-[15px] h-[15px] text-emerald-500"
            style={{ animation: "ad-spin 0.7s linear infinite" }}
          />
          Chunking & embedding files...
        </div>
        {files.map((file, i) => (
          <div key={`${file.name}-${i}`}>
            <div className="flex items-center justify-between mb-[7px]">
              <span className="font-mono text-[15px] text-slate-300">
                {file.name}
              </span>
              <span className="font-mono text-[13px] text-teal-300">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
            <div
              className="rounded-full overflow-hidden"
              style={{
                height: 6,
                background: "rgba(255,255,255,0.06)",
              }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  background: "linear-gradient(90deg, #10b981, #34d399)",
                  width: "100%",
                  animation: `ad-fillbar ${1.5 + i * 0.2}s cubic-bezier(0.4, 0, 0.2, 1) forwards`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Done state
  if (state === "done" && result) {
    return (
      <div
        className="flex items-center gap-3.5"
        style={{
          background: "rgba(16,185,129,0.06)",
          border: "1px solid rgba(16,185,129,0.25)",
          borderRadius: 16,
          padding: 22,
        }}
      >
        <span
          className="flex items-center justify-center shrink-0"
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            background: "rgba(16,185,129,0.15)",
            color: "#34d399",
          }}
        >
          <CheckCircle2 className="w-[22px] h-[22px]" />
        </span>
        <div className="flex-1">
          <div className="text-[16px] font-semibold text-slate-200">
            {result.documents.length} files processed & indexed
          </div>
          <div className="text-[14px] text-slate-400 mt-[3px]">
            Chunked, embedded, and added to your knowledge base.
          </div>
        </div>
        <button
          onClick={reset}
          className="text-[15px] font-semibold cursor-pointer transition-colors"
          style={{
            color: "#5eead4",
            background: "rgba(16,185,129,0.12)",
            border: "1px solid rgba(16,185,129,0.25)",
            padding: "9px 15px",
            borderRadius: 10,
          }}
        >
          Upload more
        </button>
      </div>
    );
  }

  // Error state
  return (
    <div
      className="flex flex-col items-center justify-center text-center cursor-pointer"
      style={{
        padding: "40px 20px",
        borderRadius: 16,
        border: "2px dashed rgba(239,68,68,0.3)",
        background: "rgba(239,68,68,0.05)",
      }}
      onClick={reset}
    >
      <AlertCircle className="w-10 h-10 text-red-400 mb-3" />
      <p className="text-[16px] font-medium text-red-300">Upload failed</p>
      {error && (
        <p className="text-[14px] text-red-400/70 mt-1">{error}</p>
      )}
      <button
        onClick={(e) => {
          e.stopPropagation();
          reset();
        }}
        className="mt-3 text-[15px] font-semibold cursor-pointer"
        style={{
          color: "#5eead4",
          background: "rgba(16,185,129,0.12)",
          border: "1px solid rgba(16,185,129,0.25)",
          padding: "9px 15px",
          borderRadius: 10,
        }}
      >
        Try again
      </button>
    </div>
  );
}
