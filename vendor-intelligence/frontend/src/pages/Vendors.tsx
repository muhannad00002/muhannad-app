import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { DiscoveryMeta, Filters, Vendor } from "../types";
import { ConfidenceBadge, Empty, StatusBadge } from "../components/ui";

const STATUSES = ["New", "Needs Verification", "Verified", "Approved", "Rejected", "Duplicate"];

export function Vendors({ t }: { t: (k: string) => string }) {
  const [filters, setFilters] = useState<Filters>({ page: 1, page_size: 25, sort: "updated_at:desc" });
  const [data, setData] = useState<{ total: number; items: Vendor[] }>({ total: 0, items: [] });
  const [meta, setMeta] = useState<DiscoveryMeta | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [active, setActive] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(false);

  const load = () => {
    setLoading(true);
    api.listVendors(filters).then((r) => setData({ total: r.total, items: r.items })).finally(() => setLoading(false));
  };
  useEffect(load, [JSON.stringify(filters)]);
  useEffect(() => { api.discoveryMeta().then(setMeta); }, []);

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const pages = Math.max(1, Math.ceil(data.total / (filters.page_size || 25)));

  const toggle = (id: number) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const bulk = async (status: string) => {
    if (!selected.size) return;
    await api.bulk([...selected], status);
    setSelected(new Set());
    load();
  };

  const exportHref = (kind: "xlsx" | "csv") =>
    selected.size
      ? api.exportUrl(kind, "selected", [...selected])
      : api.exportUrl(kind, "all");

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="card flex flex-wrap items-center gap-3 p-3">
        <input
          className="input max-w-xs"
          placeholder={t("search_placeholder")}
          onChange={(e) => set({ q: e.target.value })}
        />
        <select className="input max-w-[10rem]" onChange={(e) => set({ category: e.target.value || undefined })}>
          <option value="">{t("all_categories")}</option>
          {meta?.categories.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select className="input max-w-[10rem]" onChange={(e) => set({ governorate: e.target.value || undefined })}>
          <option value="">{t("all_governorates")}</option>
          {meta?.governorates.map((g) => <option key={g}>{g}</option>)}
        </select>
        <select className="input max-w-[10rem]" onChange={(e) => set({ status: e.target.value || undefined })}>
          <option value="">{t("status")}: All</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-1 text-sm text-slate-600">
          <input type="checkbox" onChange={(e) => set({ has_instagram: e.target.checked || undefined })} /> IG
        </label>
        <label className="flex items-center gap-1 text-sm text-slate-600">
          <input type="checkbox" onChange={(e) => set({ has_google_maps: e.target.checked || undefined })} /> Maps
        </label>
        <label className="flex items-center gap-1 text-sm text-slate-600">
          <input type="checkbox" onChange={(e) => set({ has_phone: e.target.checked || undefined })} /> Phone
        </label>

        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <>
              <span className="text-sm text-slate-500">{selected.size} selected</span>
              <button className="btn" onClick={() => bulk("Approved")}>{t("approve")}</button>
              <button className="btn" onClick={() => bulk("Rejected")}>{t("reject")}</button>
            </>
          )}
          <a className="btn" href={exportHref("csv")}>{t("export_csv")}</a>
          <a className="btn btn-primary" href={exportHref("xlsx")}>{t("export_excel")}</a>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-[11px] uppercase tracking-wide text-slate-500">
              <th className="w-10 p-3"></th>
              <th className="p-3">{t("business")}</th>
              <th className="p-3">{t("category")}</th>
              <th className="p-3">{t("governorate")}</th>
              <th className="p-3">{t("phone")}</th>
              <th className="p-3">Instagram</th>
              <th className="p-3 text-right">{t("rating")}</th>
              <th className="p-3 text-center">{t("confidence")}</th>
              <th className="p-3">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((v) => (
              <tr key={v.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="p-3">
                  <input type="checkbox" checked={selected.has(v.id)} onChange={() => toggle(v.id)} />
                </td>
                <td className="p-3">
                  <button className="font-semibold text-slate-800 hover:text-brand-ink" onClick={() => setActive(v)}>
                    {v.business_name}
                  </button>
                  {v.address && <div className="text-xs text-slate-400">{v.address}</div>}
                </td>
                <td className="p-3 text-slate-600">{v.category}</td>
                <td className="p-3 text-slate-600">{v.governorate}</td>
                <td className="p-3 tabular text-slate-600">
                  {v.phone_number ? <a href={`tel:${v.phone_number}`}>{v.phone_number}</a> : "—"}
                </td>
                <td className="p-3">
                  {v.instagram_url ? (
                    <a className="text-brand-ink" href={v.instagram_url} target="_blank" rel="noreferrer">
                      @{v.instagram_username}
                    </a>
                  ) : "—"}
                </td>
                <td className="p-3 tabular text-right text-slate-600">
                  {v.google_rating != null ? `★ ${v.google_rating}` : "—"}
                </td>
                <td className="p-3 text-center"><ConfidenceBadge score={v.confidence_score} /></td>
                <td className="p-3"><StatusBadge status={v.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.items.length && !loading && <Empty>No vendors match these filters.</Empty>}
        {loading && <Empty>Loading…</Empty>}
      </div>

      {/* Pager */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span className="tabular">{data.total} vendors</span>
        <div className="flex items-center gap-3">
          <button className="btn" disabled={(filters.page || 1) <= 1} onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) - 1 }))}>Prev</button>
          <span className="tabular">Page {filters.page} / {pages}</span>
          <button className="btn" disabled={(filters.page || 1) >= pages} onClick={() => setFilters((f) => ({ ...f, page: (f.page || 1) + 1 }))}>Next</button>
        </div>
      </div>

      {active && <VendorDrawer vendor={active} meta={meta} onClose={() => setActive(null)} onSaved={() => { setActive(null); load(); }} />}
    </div>
  );
}

function VendorDrawer({
  vendor, meta, onClose, onSaved,
}: { vendor: Vendor; meta: DiscoveryMeta | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Vendor>(vendor);
  const [saving, setSaving] = useState(false);
  const upd = (patch: Partial<Vendor>) => setDraft((d) => ({ ...d, ...patch }));

  const save = async () => {
    setSaving(true);
    try {
      await api.updateVendor(vendor.id, {
        business_name: draft.business_name,
        category: draft.category,
        phone_number: draft.phone_number,
        governorate: draft.governorate,
        city: draft.city,
        website: draft.website,
        status: draft.status,
        notes: draft.notes,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-black/30" onClick={onClose}>
      <div className="h-full w-full max-w-md overflow-y-auto bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{draft.business_name}</h2>
            <div className="text-xs text-slate-500">Quality {draft.quality_score} · Oman {draft.confidence_score}</div>
          </div>
          <button className="btn" onClick={onClose}>✕</button>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          <Field label="Business name" value={draft.business_name} onChange={(v) => upd({ business_name: v })} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Category" value={draft.category ?? ""} options={meta?.categories ?? []} onChange={(v) => upd({ category: v })} />
            <Select label="Governorate" value={draft.governorate ?? ""} options={meta?.governorates ?? []} onChange={(v) => upd({ governorate: v })} />
          </div>
          <Field label="Phone" value={draft.phone_number ?? ""} onChange={(v) => upd({ phone_number: v })} />
          <Field label="City" value={draft.city ?? ""} onChange={(v) => upd({ city: v })} />
          <Field label="Website" value={draft.website ?? ""} onChange={(v) => upd({ website: v })} />
          <Select label="Status" value={draft.status} options={STATUSES} onChange={(v) => upd({ status: v as any })} />
          <label className="text-slate-500">
            Notes
            <textarea className="input mt-1" rows={3} value={draft.notes ?? ""} onChange={(e) => upd({ notes: e.target.value })} />
          </label>

          <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            {draft.instagram_url && <div>Instagram: <a className="text-brand-ink" href={draft.instagram_url} target="_blank" rel="noreferrer">@{draft.instagram_username}</a></div>}
            {draft.google_maps_url && <div>Maps: <a className="text-brand-ink" href={draft.google_maps_url} target="_blank" rel="noreferrer">Open</a></div>}
            {draft.source && <div>Source: {draft.source}</div>}
          </div>

          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
            <button className="btn" onClick={onClose}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="text-slate-500">
      {label}
      <input className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="text-slate-500">
      {label}
      <select className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">—</option>
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
    </label>
  );
}
