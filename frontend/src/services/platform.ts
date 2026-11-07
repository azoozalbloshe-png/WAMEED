import api from "./api";
export const base = "/api/real-estate";
export type Range = {
  preset: string;
  start: string;
  end: string;
  property_id: string;
  status?: string;
  category?: string;
};
export const initialRange: Range = {
  preset: "6",
  start: "",
  end: "",
  property_id: "",
};
export const rangeQuery = (r: Range) =>
  new URLSearchParams(
    Object.fromEntries(Object.entries(r).filter(([, v]) => v !== "")),
  ).toString();
export const platform = {
  analytics: (r: Range) =>
    api.get<any>(`${base}/dashboard/analytics?${rangeQuery(r)}`),
  followUpAlerts: () => api.get<any>(`${base}/alerts`),
  alerts: () => api.get<any>(`${base}/dashboard/alerts`),
  property: (id: string) => api.get<any>(`${base}/properties/${id}/overview`),
  unit: (id: string) => api.get<any>(`${base}/units/${id}`),
  tenant: (id: string) => api.get<any>(`${base}/tenants/${id}/overview`),
  contract: (id: string) => api.get<any>(`${base}/contracts/${id}/overview`),
  permissions: () =>
    api.get<Record<string, Record<string, boolean>>>(`${base}/permissions`),
  report: (kind: string, r: Range) =>
    api.get<any>(`${base}/reports/data?kind=${kind}&${rangeQuery(r)}`),
  maintenance: () => api.get<any[]>(`${base}/maintenance`),
};
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
