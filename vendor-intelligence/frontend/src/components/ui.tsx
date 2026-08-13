// Small, dependency-free UI primitives: stat tiles, bar chart, donut, badges.

import type { VendorStatus } from "../types";

export function StatTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="card relative overflow-hidden p-4">
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent ?? "#0d9488" }}
      />
      <div className="text-[11px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="tabular mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-500">{sub}</div>}
    </div>
  );
}

export function BarChart({
  data,
  color = "#0d9488",
  limit = 10,
}: {
  data: Record<string, number>;
  color?: string;
  limit?: number;
}) {
  const entries = Object.entries(data)
    .filter(([k]) => k !== "Unknown")
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (!entries.length) return <Empty>No data yet</Empty>;
  return (
    <div className="flex flex-col gap-2">
      {entries.map(([label, value]) => (
        <div key={label} className="flex items-center gap-3 text-sm">
          <div className="w-36 shrink-0 truncate text-slate-600" title={label}>
            {label}
          </div>
          <div className="h-4 flex-1 rounded bg-slate-100">
            <div
              className="h-4 rounded"
              style={{ width: `${(value / max) * 100}%`, background: color }}
            />
          </div>
          <div className="tabular w-8 text-right text-slate-500">{value}</div>
        </div>
      ))}
    </div>
  );
}

export function Donut({ data }: { data: Record<string, number> }) {
  const colors: Record<string, string> = {
    Approved: "#16a34a",
    Verified: "#0d9488",
    "Needs Verification": "#d97706",
    New: "#64748b",
    Rejected: "#dc2626",
    Duplicate: "#a855f7",
  };
  const entries = Object.entries(data).filter(([, v]) => v > 0);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  let offset = 0;
  const radius = 60;
  const circ = 2 * Math.PI * radius;
  return (
    <div className="flex items-center gap-6">
      <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
        {entries.map(([label, value]) => {
          const frac = value / total;
          const dash = frac * circ;
          const seg = (
            <circle
              key={label}
              cx="80"
              cy="80"
              r={radius}
              fill="none"
              stroke={colors[label] ?? "#94a3b8"}
              strokeWidth="18"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
            />
          );
          offset += dash;
          return seg;
        })}
      </svg>
      <div className="flex flex-col gap-1 text-sm">
        {entries.map(([label, value]) => (
          <div key={label} className="flex items-center gap-2">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ background: colors[label] ?? "#94a3b8" }}
            />
            <span className="text-slate-600">{label}</span>
            <span className="tabular ml-auto font-medium text-slate-800">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_STYLES: Record<VendorStatus, string> = {
  Approved: "bg-green-100 text-green-700",
  Verified: "bg-teal-100 text-teal-700",
  "Needs Verification": "bg-amber-100 text-amber-700",
  New: "bg-slate-100 text-slate-600",
  Rejected: "bg-red-100 text-red-700",
  Duplicate: "bg-purple-100 text-purple-700",
};

export function StatusBadge({ status }: { status: VendorStatus }) {
  return <span className={`pill ${STATUS_STYLES[status] ?? ""}`}>{status}</span>;
}

export function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 90 ? "bg-green-100 text-green-700"
    : score >= 75 ? "bg-teal-100 text-teal-700"
    : score >= 50 ? "bg-amber-100 text-amber-700"
    : "bg-red-100 text-red-700";
  return <span className={`pill tabular ${color}`}>{score}</span>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="py-10 text-center text-sm text-slate-400">{children}</div>;
}

export function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        {right}
      </div>
      {children}
    </div>
  );
}
