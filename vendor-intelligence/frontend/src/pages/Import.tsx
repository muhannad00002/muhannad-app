import { useEffect, useState } from "react";
import { api } from "../api";
import type { DiscoveryMeta } from "../types";
import { Section } from "../components/ui";

export function ImportPage({ t }: { t: (k: string) => string }) {
  const [meta, setMeta] = useState<DiscoveryMeta | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.discoveryMeta().then(setMeta); }, []);

  const submit = async () => {
    if (!file) return;
    setBusy(true); setError(null); setResult(null);
    try {
      setResult(await api.importFile(file, category || undefined, governorate || undefined));
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Section title={`${t("import")} — Instagram URLs / CSV / Excel`}>
        <p className="mb-4 text-sm text-slate-500">
          Upload a <b>.csv</b>, <b>.xlsx</b>, or <b>.txt</b> of manually collected vendors.
          Recognised columns: Business Name, Instagram URL, Category, Phone, Governorate.
          A plain list of Instagram URLs (one per line) also works. Rows run through the
          same enrichment, Oman-verification and de-duplication pipeline.
        </p>

        <input
          type="file"
          accept=".csv,.xlsx,.txt"
          className="input"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">Default category (auto-detect)</option>
            {meta?.categories.map((c) => <option key={c}>{c}</option>)}
          </select>
          <select className="input" value={governorate} onChange={(e) => setGovernorate(e.target.value)}>
            <option value="">Default governorate</option>
            {meta?.governorates.map((g) => <option key={g}>{g}</option>)}
          </select>
        </div>

        <button className="btn btn-primary mt-4" disabled={!file || busy} onClick={submit}>
          {busy ? "Importing…" : "Import & enrich"}
        </button>

        {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}
        {result && (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Parsed", result.parsed],
              ["New", result.new_vendors],
              ["Duplicates", result.duplicates],
              ["Needs verify", result.needs_verification],
              ["Errors", result.errors],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-lg bg-slate-50 p-3 text-center">
                <div className="tabular text-xl font-bold text-slate-800">{value as number}</div>
                <div className="text-xs text-slate-500">{label as string}</div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
