import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import type { DiscoveryMeta, Job } from "../types";
import { Section } from "../components/ui";

export function Discover({ t }: { t: (k: string) => string }) {
  const [meta, setMeta] = useState<DiscoveryMeta | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [governorate, setGovernorate] = useState("");
  const [deep, setDeep] = useState(false);
  const [job, setJob] = useState<Job | null>(null);
  const [preview, setPreview] = useState<string[] | null>(null);
  const poll = useRef<number | null>(null);

  useEffect(() => { api.discoveryMeta().then(setMeta); }, []);
  useEffect(() => () => { if (poll.current) clearInterval(poll.current); }, []);

  const toggle = (c: string) =>
    setSelected((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });

  const start = async () => {
    const j = await api.startDiscovery({
      categories: [...selected],
      governorate: governorate || null,
      deep,
      sources: ["instagram", "google_maps"],
    });
    setJob(j);
    if (poll.current) clearInterval(poll.current);
    poll.current = window.setInterval(async () => {
      const updated = await api.job(j.id);
      setJob(updated);
      if (["completed", "cancelled", "failed"].includes(updated.status) && poll.current) {
        clearInterval(poll.current);
      }
    }, 1000);
  };

  const showPreview = async () => {
    const cat = [...selected][0] || meta?.categories[0];
    if (!cat) return;
    const p = await api.preview(cat, deep, governorate || undefined);
    setPreview(p.queries);
  };

  const pct = job && job.total_queries ? Math.round((job.completed_queries / job.total_queries) * 100) : 0;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 flex flex-col gap-4">
        <Section title={t("discover") + " — Oman"}>
          {meta?.manual_mode && (
            <div className="mb-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-700">
              No web-search key configured — automated discovery is in manual mode. Add
              a search key (see README) or use the <b>Import</b> tab to add Instagram
              URLs. Enrichment, verification, dedup and export still work.
            </div>
          )}
          <div className="mb-3 flex items-center gap-3">
            <select className="input max-w-[12rem]" value={governorate} onChange={(e) => setGovernorate(e.target.value)}>
              <option value="">{t("all_governorates")}</option>
              {meta?.governorates.map((g) => <option key={g}>{g}</option>)}
            </select>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={deep} onChange={(e) => setDeep(e.target.checked)} />
              {t("deep_search")}
            </label>
            <button className="btn ml-auto" onClick={() => setSelected(new Set(meta?.categories))}>Select all</button>
            <button className="btn" onClick={() => setSelected(new Set())}>Clear</button>
          </div>

          <div className="flex flex-wrap gap-2">
            {meta?.categories.map((c) => (
              <button key={c} className={`chip ${selected.has(c) ? "chip-active" : ""}`} onClick={() => toggle(c)}>
                {c}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <button className="btn" onClick={showPreview}>Preview queries</button>
            <button className="btn btn-primary" disabled={!selected.size} onClick={start}>
              {t("start_discovery")} ({selected.size})
            </button>
          </div>
        </Section>

        {preview && (
          <Section title={`Preview — ${preview.length} queries`} right={<button className="btn" onClick={() => setPreview(null)}>Hide</button>}>
            <ul className="max-h-56 overflow-y-auto text-xs text-slate-600">
              {preview.map((q, i) => <li key={i} className="border-b border-slate-100 py-1 font-mono">{q}</li>)}
            </ul>
          </Section>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <Section title="Live progress">
          {!job ? (
            <div className="text-sm text-slate-400">No active job. Select categories and start discovery.</div>
          ) : (
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">Job #{job.id}</span>
                <span className="pill bg-slate-100 text-slate-600">{job.status}</span>
              </div>
              {job.current_category && <div className="text-slate-500">Category: {job.current_category}</div>}
              <div className="h-2 rounded bg-slate-100">
                <div className="h-2 rounded bg-brand" style={{ width: `${pct}%` }} />
              </div>
              <div className="tabular text-xs text-slate-500">{job.completed_queries} / {job.total_queries} queries ({pct}%)</div>
              <div className="grid grid-cols-2 gap-2 text-center">
                <Stat label="Found" value={job.results_found} />
                <Stat label="New" value={job.new_vendors} />
                <Stat label="Duplicates" value={job.duplicates} />
                <Stat label="Needs verify" value={job.needs_verification} />
              </div>
              {["running", "paused"].includes(job.status) && (
                <div className="flex gap-2">
                  {job.status === "running"
                    ? <button className="btn flex-1" onClick={() => api.controlJob(job.id, "pause")}>Pause</button>
                    : <button className="btn flex-1" onClick={() => api.controlJob(job.id, "resume")}>Resume</button>}
                  <button className="btn flex-1" onClick={() => api.controlJob(job.id, "cancel")}>Cancel</button>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <div className="tabular text-lg font-bold text-slate-800">{value}</div>
      <div className="text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
