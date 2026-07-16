"use client";

import { AlertTriangle } from "lucide-react";

interface DeleteDialogProps {
  docName: string;
  numChunks: number;
  isOpen: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

export function DeleteDialog({
  docName,
  numChunks,
  isOpen,
  onConfirm,
  onClose,
}: DeleteDialogProps) {
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
        className="w-full"
        style={{
          maxWidth: 400,
          background: "linear-gradient(180deg, #141017, #0f0a0e)",
          border: "1px solid rgba(239,68,68,0.2)",
          borderRadius: 18,
          padding: 24,
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Alert icon */}
        <span
          className="flex items-center justify-center mb-4"
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: "rgba(239,68,68,0.12)",
            color: "#f87171",
          }}
        >
          <AlertTriangle className="w-[22px] h-[22px]" />
        </span>

        <h3 className="text-[17px] font-bold tracking-tight text-slate-50 m-0">
          Delete document?
        </h3>
        <p className="text-[13px] text-slate-400 leading-[1.55] mt-[9px] m-0">
          This will permanently remove{" "}
          <span className="font-mono text-slate-200">{docName}</span> and all{" "}
          {numChunks} indexed chunk{numChunks !== 1 ? "s" : ""}. This can&apos;t
          be undone.
        </p>

        <div className="flex gap-2.5 mt-[22px]">
          <button
            onClick={onClose}
            className="flex-1 text-[13px] font-semibold cursor-pointer transition-colors hover:bg-white/[0.09]"
            style={{
              color: "#cbd5e1",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: 11,
              borderRadius: 11,
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 text-[13px] font-semibold cursor-pointer transition-colors hover:bg-red-500"
            style={{
              color: "#fff",
              background: "#dc2626",
              border: "1px solid #ef4444",
              padding: 11,
              borderRadius: 11,
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
