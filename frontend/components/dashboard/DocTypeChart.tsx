"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

interface DocTypeChartProps {
  documentsByType: Record<string, number>;
}

const TYPE_COLORS: Record<string, string> = {
  pdf: "#3b82f6",
  docx: "#8b5cf6",
  txt: "#10b981",
  doc: "#f59e0b",
  md: "#ec4899",
};

function getColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] || "#6b7280";
}

export function DocTypeChart({ documentsByType }: DocTypeChartProps) {
  const data = Object.entries(documentsByType).map(([type, count]) => ({
    type: type.toUpperCase(),
    count,
    fill: getColor(type),
  }));

  if (data.length === 0) {
    return (
      <Card className="border-0 bg-slate-800/60 ring-white/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <FileText className="h-4 w-4 text-slate-400" />
            Documents by Type
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-8 text-center text-sm text-slate-500">
            No documents uploaded yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 bg-slate-800/60 ring-white/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <FileText className="h-4 w-4 text-slate-400" />
          Documents by Type
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 4, right: 4, bottom: 4, left: -12 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="type"
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#94a3b8", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#1e293b",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#e2e8f0",
                  fontSize: "13px",
                }}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={48}>
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
