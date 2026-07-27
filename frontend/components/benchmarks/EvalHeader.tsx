"use client";

import { Loader2, Play, Clock } from "lucide-react";

interface EvalHeaderProps {
  isRunning: boolean;
  progress: string;
  lastRun: string | null;
  duration: number | null;
  onRun: () => void;
}

export function EvalHeader({ isRunning, progress, lastRun, duration, onRun }: EvalHeaderProps) {
  const formatDuration = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="flex items-end justify-between mb-6 flex-wrap gap-3 animate-in">
      <div>
        <h1 className="text-[32px] font-bold text-slate-50 m-0" style={{ letterSpacing: "-0.025em" }}>
          Benchmarks
        </h1>
        <p className="mt-1 text-[17px] text-slate-400 m-0">
          RAG pipeline evaluation on standard datasets
        </p>
      </div>
      <div className="flex items-center gap-3">
        {lastRun && duration != null && (
          <span
            className="flex items-center gap-2 text-[14px] text-slate-500"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
              padding: "8px 14px",
              borderRadius: 99,
            }}
          >
            <Clock className="w-4 h-4" />
            Last run: {formatDuration(duration)}
          </span>
        )}
        <button
          onClick={onRun}
          disabled={isRunning}
          className="flex items-center gap-2 text-[15px] font-semibold cursor-pointer transition-all"
          style={{
            padding: "10px 20px",
            borderRadius: 12,
            border: "none",
            background: isRunning
              ? "rgba(255,255,255,0.06)"
              : "linear-gradient(140deg, #10b981, #059669)",
            color: isRunning ? "#94a3b8" : "#04120c",
            boxShadow: isRunning ? "none" : "0 4px 14px rgba(16,185,129,0.35)",
          }}
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Running...
            </>
          ) : (
            <>
              <Play className="w-4 h-4" /> Run Evaluation
            </>
          )}
        </button>
      </div>
      {isRunning && progress && (
        <div
          className="w-full text-[15px] text-teal-300 font-mono"
          style={{
            background: "rgba(16,185,129,0.06)",
            border: "1px solid rgba(16,185,129,0.15)",
            padding: "10px 16px",
            borderRadius: 10,
          }}
        >
          {progress}
        </div>
      )}
    </div>
  );
}
