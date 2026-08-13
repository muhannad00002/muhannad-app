// Typed client for the backend REST API.

import type {
  DiscoveryMeta,
  Filters,
  Job,
  Stats,
  Vendor,
  VendorList,
} from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "";

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
    ...opts,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function toQuery(filters: Filters): string {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") p.set(k, String(v));
  });
  return p.toString();
}

export const api = {
  health: () => req<{ status: string }>("/api/health"),
  stats: () => req<Stats>("/api/stats"),

  listVendors: (filters: Filters) =>
    req<VendorList>(`/api/vendors?${toQuery(filters)}`),
  getVendor: (id: number) => req<Vendor>(`/api/vendors/${id}`),
  updateVendor: (id: number, patch: Partial<Vendor>) =>
    req<Vendor>(`/api/vendors/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
  bulk: (ids: number[], status: string) =>
    req<{ updated: number }>("/api/vendors/bulk", {
      method: "POST",
      body: JSON.stringify({ ids, status }),
    }),
  deleteVendor: (id: number) =>
    req<{ deleted: number }>(`/api/vendors/${id}`, { method: "DELETE" }),
  audit: (id: number) => req<any[]>(`/api/vendors/${id}/audit`),

  discoveryMeta: () => req<DiscoveryMeta>("/api/discovery/meta"),
  preview: (category: string, deep: boolean, governorate?: string) =>
    req<{ count: number; queries: string[] }>(
      `/api/discovery/preview?${toQuery({ category, deep, governorate } as any)}`
    ),
  startDiscovery: (body: {
    categories: string[];
    governorate?: string | null;
    deep: boolean;
    sources: string[];
  }) => req<Job>("/api/discovery/start", { method: "POST", body: JSON.stringify(body) }),
  jobs: () => req<Job[]>("/api/discovery/jobs"),
  job: (id: number) => req<Job>(`/api/discovery/jobs/${id}`),
  controlJob: (id: number, action: "pause" | "resume" | "cancel") =>
    req<{ action: string }>(`/api/discovery/jobs/${id}/${action}`, { method: "POST" }),

  importFile: async (file: File, category?: string, governorate?: string) => {
    const fd = new FormData();
    fd.append("file", file);
    if (category) fd.append("category", category);
    if (governorate) fd.append("governorate", governorate);
    const res = await fetch(`${BASE}/api/import`, { method: "POST", body: fd });
    if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
    return res.json();
  },

  exportUrl: (kind: "xlsx" | "csv", scope: string, ids?: number[]) => {
    const p = new URLSearchParams({ scope });
    if (ids && ids.length) p.set("ids", ids.join(","));
    return `${BASE}/api/export.${kind}?${p.toString()}`;
  },
};
