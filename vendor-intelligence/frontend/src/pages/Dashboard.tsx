import { useEffect, useState } from "react";
import { api } from "../api";
import type { Stats } from "../types";
import { BarChart, Donut, Section, StatTile } from "../components/ui";

export function Dashboard({ t }: { t: (k: string) => string }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError(String(e)));
  }, []);

  if (error)
    return (
      <div className="card p-6 text-sm">
        <div className="font-semibold text-red-600">Couldn’t reach the API: {error}</div>
        <div className="mt-2 text-slate-500">
          Make sure the backend is running. Open{" "}
          <a className="text-brand-ink underline" href="/api/health" target="_blank" rel="noreferrer">
            /api/health
          </a>{" "}
          — if that also fails, start it with <code className="rounded bg-slate-100 px-1">uvicorn main:app --reload</code>{" "}
          in <code className="rounded bg-slate-100 px-1">vendor-intelligence/backend</code>.
        </div>
      </div>
    );
  if (!stats) return <div className="card p-6 text-sm text-slate-500">Loading…</div>;

  const tiles: { label: string; value: number; accent?: string }[] = [
    { label: t("total_vendors"), value: stats.total_vendors },
    { label: t("verified"), value: stats.verified, accent: "#0d9488" },
    { label: t("needs_verification"), value: stats.needs_verification, accent: "#d97706" },
    { label: t("approved"), value: stats.approved, accent: "#16a34a" },
    { label: t("rejected"), value: stats.rejected, accent: "#dc2626" },
    { label: t("categories"), value: stats.categories },
    { label: t("governorates"), value: stats.governorates },
    { label: t("instagram_accounts"), value: stats.instagram_accounts, accent: "#a855f7" },
    { label: t("google_maps_matches"), value: stats.google_maps_matches, accent: "#0563C1" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <StatTile key={tile.label} label={tile.label} value={tile.value} accent={tile.accent} />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title={t("by_category")}>
          <BarChart data={stats.by_category} />
        </Section>
        <Section title={t("by_governorate")}>
          <BarChart data={stats.by_governorate} color="#6366f1" />
        </Section>
      </div>

      <Section title={t("verification_status")}>
        <Donut data={stats.by_status} />
      </Section>
    </div>
  );
}
