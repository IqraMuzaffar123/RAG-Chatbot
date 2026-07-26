"use client";

interface ConfidenceBadgeProps {
  confidence: number;
}

export function ConfidenceBadge({ confidence }: ConfidenceBadgeProps) {
  const pct = Math.round(confidence * 100);

  let color: string;
  let label: string;
  if (pct >= 80) {
    color = "#10b981";
    label = "High";
  } else if (pct >= 50) {
    color = "#f59e0b";
    label = "Medium";
  } else {
    color = "#ef4444";
    label = "Low";
  }

  // SVG ring
  const size = 28;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <span
      className="inline-flex items-center gap-1.5"
      title={`${label} confidence: ${pct}%`}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.5s ease" }}
        />
      </svg>
      <span
        className="font-mono text-[13px] font-bold"
        style={{ color }}
      >
        {pct}%
      </span>
    </span>
  );
}
