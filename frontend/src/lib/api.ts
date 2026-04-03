import type { Condition, Symptom } from "@shared/types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.formErrors?.[0] ?? body?.error ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return null as T;
  return res.json();
}

// SWR fetcher — keyed by URL
export const fetcher = <T>(url: string): Promise<T> => request<T>(url);

export const api = {
  createCondition: (data: { name: string }) =>
    request<Condition>("/api/conditions", { method: "POST", body: JSON.stringify(data) }),
  updateCondition: (id: string, data: { name: string }) =>
    request<Condition>(`/api/conditions/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteCondition: (id: string) =>
    request<null>(`/api/conditions/${id}`, { method: "DELETE" }),

  linkSymptom: (conditionId: string, symptomId: string) =>
    request<void>(`/api/conditions/${conditionId}/symptoms/${symptomId}`, { method: "POST" }),
  unlinkSymptom: (conditionId: string, symptomId: string) =>
    request<void>(`/api/conditions/${conditionId}/symptoms/${symptomId}`, { method: "DELETE" }),

  createSymptom: (data: { name: string }) =>
    request<Symptom>("/api/symptoms", { method: "POST", body: JSON.stringify(data) }),
  updateSymptom: (id: string, data: { name: string }) =>
    request<Symptom>(`/api/symptoms/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deleteSymptom: (id: string) =>
    request<null>(`/api/symptoms/${id}`, { method: "DELETE" }),

  linkCondition: (symptomId: string, conditionId: string) =>
    request<void>(`/api/symptoms/${symptomId}/conditions/${conditionId}`, { method: "POST" }),
  unlinkCondition: (symptomId: string, conditionId: string) =>
    request<void>(`/api/symptoms/${symptomId}/conditions/${conditionId}`, { method: "DELETE" }),
};
