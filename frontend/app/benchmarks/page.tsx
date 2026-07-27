"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EvalHeader } from "@/components/benchmarks/EvalHeader";
import { ScoreCards } from "@/components/benchmarks/ScoreCards";
import { MetricsRadarChart } from "@/components/benchmarks/RadarChart";
import { AblationChart } from "@/components/benchmarks/AblationChart";
import { DatasetTable } from "@/components/benchmarks/DatasetTable";
import { EvalHistory } from "@/components/benchmarks/EvalHistory";
import {
  startEvalRun,
  fetchEvalStatus,
  fetchEvalResults,
  fetchEvalHistory,
  type EvalResults,
  type EvalRun,
} from "@/lib/api";

export default function BenchmarksPage() {
  const [results, setResults] = useState<EvalResults | null>(null);
  const [history, setHistory] = useState<EvalRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Eval run state
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState("");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadAll = useCallback(async () => {
    const [resultsRes, historyRes] = await Promise.allSettled([
      fetchEvalResults(),
      fetchEvalHistory(),
    ]);

    if (resultsRes.status === "fulfilled") {
      setResults(resultsRes.value);
    } else {
      // 404 = no runs yet, not a real error
      const msg: string = (resultsRes.reason as Error)?.message ?? "";
      if (!msg.includes("404") && !msg.toLowerCase().includes("not found")) {
        setError(msg);
      }
    }

    if (historyRes.status === "fulfilled") {
      setHistory(historyRes.value.runs ?? []);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

  // Poll while running
  const startPolling = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await fetchEvalStatus();
        if (status.progress) setProgress(status.progress);

        if (status.status === "completed" || status.status === "failed") {
          clearInterval(pollRef.current!);
          pollRef.current = null;
          setIsRunning(false);
          setProgress("");
          await loadAll();
        }
      } catch {
        // silently ignore poll errors
      }
    }, 5000);
  }, [loadAll]);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const handleRun = useCallback(async () => {
    if (isRunning) return;
    setIsRunning(true);
    setProgress("Starting evaluation…");
    setError(null);
    try {
      await startEvalRun();
      startPolling();
    } catch (err) {
      setError((err as Error).message);
      setIsRunning(false);
      setProgress("");
    }
  }, [isRunning, startPolling]);

  const lastRun = results?.completed_at ?? null;
  const duration = results?.duration_seconds ?? null;

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ padding: "24px 32px 36px" }}
    >
      <EvalHeader
        isRunning={isRunning}
        progress={progress}
        lastRun={lastRun}
        duration={duration}
        onRun={handleRun}
      />

      {error && (
        <div
          className="rounded-2xl px-4 py-3 text-sm text-red-400 mb-4"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          {error}
        </div>
      )}

      {/* Score Cards — 3x2 grid */}
      <ScoreCards scores={loading ? null : (results?.overall ?? null)} />

      {/* Radar + Ablation side by side */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <MetricsRadarChart scores={loading ? null : (results?.overall ?? null)} />
        <AblationChart byConfig={loading ? null : (results?.by_config ?? null)} />
      </div>

      {/* Per-dataset table */}
      {!loading && results?.by_dataset && (
        <DatasetTable byDataset={results.by_dataset} />
      )}

      {/* Eval history */}
      {!loading && history.length > 0 && <EvalHistory runs={history} />}
    </div>
  );
}
