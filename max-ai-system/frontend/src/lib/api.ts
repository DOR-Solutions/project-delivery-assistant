const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const r = await fetch(BASE + path);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}
async function post<T>(path: string, body: any): Promise<T> {
  const r = await fetch(BASE + path, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

export interface Project { id: string; name: string; terminal: string; }
export interface Doc { id: string; name: string; kind: string; summary: string; topics: string[]; insights: any[]; status: string; }
export interface OpsSummary { kpis: { bags: number; utilisation: number; adherence: number; open_high: number; critical: number }; tasks: any[]; risks: any[]; }
export interface Forecast { directs: any[]; mitigation: { fc: any[]; avg_total: number }; }

export const api = {
  health: () => get<{ status: string }>("/health"),
  projects: () => get<Project[]>("/projects"),
  byTerminal: () => get<Record<string, Project[]>>("/projects/by-terminal"),
  createProject: (name: string, terminal: string) => post<Project>("/projects", { name, terminal }),
  documents: (pid: string) => get<Doc[]>(`/documents?project_id=${pid}`),
  uploadDoc: async (pid: string, file: File): Promise<Doc> => {
    const fd = new FormData(); fd.append("project_id", pid); fd.append("file", file);
    const r = await fetch(`${BASE}/documents/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  opsSummary: (pid: string) => get<OpsSummary>(`/ops/summary?project_id=${pid}`),
  impact: (pid: string, area: string) => get<any>(`/ops/impact?project_id=${pid}&area=${area}`),
  forecast: (pid: string) => get<Forecast>(`/ops/forecast?project_id=${pid}`),
  aiStatus: () => get<{ available: boolean }>("/ai/status"),
  chat: (pid: string, message: string, history: any[]) => post<{ reply: string; ai: boolean }>("/ai/chat", { project_id: pid, message, history }),
};
