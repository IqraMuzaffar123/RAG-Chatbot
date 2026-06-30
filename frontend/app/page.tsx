"use client";

import { useEffect, useState } from "react";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { RecentQueries } from "@/components/dashboard/RecentQueries";
import { DocTypeChart } from "@/components/dashboard/DocTypeChart";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchStats, type StatsResponse } from "@/lib/api";

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
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Overview of your knowledge base
        </p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-slate-800/60" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          Failed to load stats: {error}
        </div>
      ) : (
        <StatsCards stats={stats} />
      )}

      {/* Bottom Row */}
      {loading ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 rounded-xl bg-slate-800/60" />
          <Skeleton className="h-72 rounded-xl bg-slate-800/60" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <RecentQueries queries={stats?.recent_queries ?? []} />
          <DocTypeChart documentsByType={stats?.documents_by_type ?? {}} />
        </div>
      )}
    </div>
  );
}
