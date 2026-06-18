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
export interface Health { rag: "green" | "amber" | "red"; label: string; }
export interface Workstream { name: string; pct: number; }
export interface GateStage { gate: string; label: string; status: "done" | "active" | "todo"; }
export interface Gates { current: string; next: string; next_label: string; stages: GateStage[]; }

export interface Summary {
  project_id: string; name: string; terminal: string; completion: number;
  health: Health;
  kpis: { completion: number; bags: number; utilisation: number; adherence: number; open_risks: number; critical: number; tasks_today: number; next_gate: string; };
  milestones: { on_track: number; total: number; items: { name: string; on_track: boolean }[] };
  workstreams: Workstream[];
  gates: Gates;
  throughput: { date: string; planned: number; actual: number }[];
  tasks: any[]; risks: any[];
  crew_baseline: number; crew_on_shift: number;
}

export interface PortfolioProject { project_id: string; name: string; terminal: string; completion: number; health: Health; open_risks: number; critical: number; next_gate: string; risk_count: number; }
export interface PortfolioOut { projects: PortfolioProject[]; rag_counts: { green: number; amber: number; red: number }; avg_completion: number; total_open_risks: number; total_critical: number; }
export interface WhatIfOut { utilisation: number; projected_completion: number; risk_index: string; sat_date_shift: number; }
export interface ForesightOut { predictions: any[]; synergies: any[]; }
export interface SynergyOpp {
  supplier: string;
  projects: { id: string; name: string; terminal: string; budget: number; start: string; finish: string }[];
  combined_budget: number; overlap: boolean; overlap_summary: string;
  saving: number; shared_overhead: number; merged_schedule: number; recommendation: string;
}
export interface SynergyOut { currency: string; opportunities: SynergyOpp[]; total_saving: number; }
export interface LookAheadActivity {
  id: string; name: string; wbs: string; discipline: string; pct: number; remaining: number;
  start: string; finish: string; bl_finish: string; total_float: number;
  preds: string[]; succs: string[]; variance_days: number; critical: boolean; slipping: boolean; status: string;
}
export interface LookAheadOut {
  name: string;
  summary: { total: number; critical: number; slipping: number; on_track: number; worst_variance: number; by_discipline: Record<string, number>; as_of: string; window_end: string; weeks: number };
  activities: LookAheadActivity[];
  wbs_groups: { wbs: string; activities: LookAheadActivity[] }[];
  disciplines: Record<string, string>;
  risks: { title: string; rationale: string; band: string; score: number }[];
}
export interface ResourcesOut {
  has_resources: boolean; name: string; currency: string;
  headcount: number; daily_cost: number; weekly_cost: number; projected_cost: number; weeks_remaining: number; suppliers: number;
  lines: { supplier: string; role: string; count: number; day_rate: number; daily_cost: number }[];
  by_supplier: { supplier: string; headcount: number; daily_cost: number; roles: string[] }[];
  by_role: { role: string; count: number; daily_cost: number }[];
}
export interface SysNode { id: string; name: string; capacity: number; status: string; share_pct: number; bags: number; }
export interface SystemMapOut { nodes: SysNode[]; edges: { from: string; to: string }[]; }
export interface ImpactOut { area: { id: string; name: string; capacity: number }; share_pct: number; bags_affected: number; downstream: string[]; severity: string; }
export interface Supplier { name: string; category: string; contact: string; email: string; phone: string; services: string; framework: string; rating: number; }
export interface PslOut { categories: string[]; counts: Record<string, number>; total: number; suppliers: Supplier[]; }
export interface StrategyOut {
  ai: boolean;
  narrative: string;
  objective: string;
  mitigation_actions: { area: string; action: string; mitigation: string; responsibility: string; priority: string }[];
  fmea: { process: string; failure_mode: string; effect: string; severity: number; controls: string }[];
  access_windows: { item: number; area: string; access: string; start: string; finish: string; original_duration: string; new_duration: string }[];
  approvals: { name: string; company: string; role: string }[];
  command_control: string;
  contingency: string;
  predicted_risks: { title: string; likelihood: number; impact: number; score?: number; band?: string; source?: string; rationale: string }[];
  todo: { id?: string; text: string; detail?: string; owner: string; pri?: string; priority?: string; tag?: string }[];
  inputs: { documents: number; risks: number; bag_days: number; forecast_days: number };
}
export interface BudgetSupplier { name: string; budget: number; spent: number; remaining: number; pct_spent: number; status: string; }
export interface BudgetOut {
  has_budget: boolean; name: string; currency?: string;
  bac?: number; ac?: number; allocated?: number; ev?: number; cpi?: number; eac?: number; vac?: number;
  overspend?: number; pct_spent?: number; completion?: number; verdict?: string; rag?: string;
  suppliers?: BudgetSupplier[];
}
export interface Forecast { directs: any[]; mitigation: { fc: any[]; avg_total: number }; }

export const api = {
  health: () => get<{ status: string }>("/health"),
  projects: () => get<Project[]>("/projects"),
  byTerminal: () => get<Record<string, Project[]>>("/projects/by-terminal"),
  createProject: (name: string, terminal: string) => post<Project>("/projects", { name, terminal }),
  documents: (pid: string) => get<Doc[]>(`/documents?project_id=${pid}`),
  ingestStatus: () => get<any>("/ingest/status"),
  ingestScan: () => post<any>("/ingest/scan", {}),
  uploadDoc: async (pid: string, file: File): Promise<Doc> => {
    const fd = new FormData(); fd.append("project_id", pid); fd.append("file", file);
    const r = await fetch(`${BASE}/documents/upload`, { method: "POST", body: fd });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  summary: (pid: string) => get<Summary>(`/ops/summary?project_id=${pid}`),
  portfolio: () => get<PortfolioOut>("/ops/portfolio"),
  whatif: (project_id: string, bag_volume_pct: number, crew_on_shift: number, extra_completion: number) =>
    post<WhatIfOut>("/ops/whatif", { project_id, bag_volume_pct, crew_on_shift, extra_completion }),
  foresight: () => get<ForesightOut>("/ops/foresight"),
  budget: (pid: string) => get<BudgetOut>(`/ops/budget?project_id=${pid}`),
  resources: (pid: string) => get<ResourcesOut>(`/ops/resources?project_id=${pid}`),
  synergy: () => get<SynergyOut>("/ops/synergy"),
  lookahead: (pid: string, weeks = 6) => get<LookAheadOut>(`/ops/lookahead?project_id=${pid}&weeks=${weeks}`),
  psl: (category = "", q = "") => get<PslOut>(`/ops/psl?category=${encodeURIComponent(category)}&q=${encodeURIComponent(q)}`),
  strategy: (pid: string, focus = "") => get<StrategyOut>(`/ops/strategy?project_id=${pid}&focus=${encodeURIComponent(focus)}`),
  exportPptx: async (plan: any): Promise<Blob> => {
    const r = await fetch(`${BASE}/ops/strategy/pptx`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(plan) });
    if (!r.ok) throw new Error(await r.text());
    return r.blob();
  },
  systemMap: (pid: string) => get<SystemMapOut>(`/ops/systemmap?project_id=${pid}`),
  impact: (pid: string, area: string) => get<ImpactOut>(`/ops/impact?project_id=${pid}&area=${area}`),
  forecast: (pid: string) => get<Forecast>(`/ops/forecast?project_id=${pid}`),
  aiStatus: () => get<{ available: boolean }>("/ai/status"),
  chat: (pid: string, message: string, history: any[]) => post<{ reply: string; ai: boolean }>("/ai/chat", { project_id: pid, message, history }),
};
