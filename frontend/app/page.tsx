"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentQueries } from "@/components/dashboard/RecentQueries";
import { DocTypeChart } from "@/components/dashboard/DocTypeChart";
import { fetchStats, type StatsResponse } from "@/lib/api";
import { Upload, MessageSquare } from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats()
      .then(setStats)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="h-full flex flex-col overflow-y-auto"
      style={{ padding: "28px 32px 32px" }}
    >
      {/* Header */}
      <div className="mb-6 shrink-0 animate-in">
        <h1 className="text-3xl font-bold tracking-tight text-slate-50 m-0">
          Dashboard
        </h1>
        <p className="mt-1.5 text-[15px] text-slate-400 m-0">
          Your knowledge base at a glance
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-2xl px-4 py-3 text-sm text-red-400 mb-4 shrink-0"
          style={{
            background: "rgba(239,68,68,0.08)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
        >
          Failed to load stats: {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="shrink-0">
        <StatsCards stats={stats} loading={loading} />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-4 shrink-0">
        <Link
          href="/documents"
          className="gradient-card gradient-card-emerald flex items-center gap-4 animate-in delay-5"
          style={{ padding: "18px 22px", textDecoration: "none" }}
        >
          <span
            className="flex items-center justify-center shrink-0"
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "rgba(16,185,129,0.15)",
              border: "1px solid rgba(16,185,129,0.25)",
            }}
          >
            <Upload className="w-5 h-5 text-emerald-400" />
          </span>
          <div>
            <div className="text-[15px] font-semibold text-slate-100">
              Upload Documents
            </div>
            <div className="text-[13px] text-slate-500 mt-0.5">
              Add PDF, DOCX, or TXT files to your knowledge base
            </div>
          </div>
        </Link>

        <Link
          href="/chat"
          className="gradient-card gradient-card-cyan flex items-center gap-4 animate-in delay-6"
          style={{ padding: "18px 22px", textDecoration: "none" }}
        >
          <span
            className="flex items-center justify-center shrink-0"
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "rgba(6,182,212,0.15)",
              border: "1px solid rgba(6,182,212,0.25)",
            }}
          >
            <MessageSquare className="w-5 h-5 text-cyan-400" />
          </span>
          <div>
            <div className="text-[15px] font-semibold text-slate-100">
              Ask a Question
            </div>
            <div className="text-[13px] text-slate-500 mt-0.5">
              Get AI-powered answers with citations from your documents
            </div>
          </div>
        </Link>
      </div>

      {/* Bottom Row — fills remaining height */}
      <div className="flex-1 min-h-0">
        {loading ? (
          <div className="grid grid-cols-[1.6fr_1fr] gap-4 h-full">
            <div className="gradient-card" style={{ minHeight: 300 }}>
              <div style={{ padding: "16px 18px" }}>
                <div className="skeleton" style={{ width: 140, height: 18 }} />
              </div>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} style={{ padding: "12px 18px" }}>
                  <div className="skeleton" style={{ width: "80%", height: 14 }} />
                </div>
              ))}
            </div>
            <div className="gradient-card" style={{ minHeight: 300 }}>
              <div style={{ padding: "16px 18px" }}>
                <div className="skeleton" style={{ width: 120, height: 18 }} />
              </div>
              <div className="flex items-center justify-center" style={{ padding: 40 }}>
                <div className="skeleton" style={{ width: 140, height: 140, borderRadius: "50%" }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-[1.6fr_1fr] gap-4 h-full">
            <RecentQueries queries={stats?.recent_queries ?? []} />
            <DocTypeChart documentsByType={stats?.documents_by_type ?? {}} />
          </div>
        )}
      </div>
    </div>
  );
}
