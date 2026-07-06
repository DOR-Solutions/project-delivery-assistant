import { useEffect, useState } from "react";
import { api, PortfolioOut } from "../lib/api";

const RAG: Record<string, string> = { green: "#178A43", amber: "#B0720A", red: "#D4374C" };

export default function Portfolio({ onOpen }: { onOpen: (pid: string) => void }) {
  const [p, setP] = useState<PortfolioOut | null>(null);
  useEffect(() => { api.portfolio().then(setP).catch(() => {}); }, []);
  if (!p) return <div><div className="eyebrow">Workspace</div><h1>Portfolio</h1><div className="card">Loading…</div></div>;

  return (
    <div>
      <div className="eyebrow">Workspace</div>
      <h1>Portfolio — {p.projects.length} projects</h1>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        <div className="kpi"><div className="label">Avg completion</div><div className="val" style={{ color: "#009E84" }}>{p.avg_completion}%</div></div>
        <div className="kpi"><div className="label">Green / Amber / Red</div><div className="val" style={{ fontSize: 20 }}>
          <span style={{ color: RAG.green }}>{p.rag_counts.green}</span> / <span style={{ color: RAG.amber }}>{p.rag_counts.amber}</span> / <span style={{ color: RAG.red }}>{p.rag_counts.red}</span>
        </div></div>
        <div className="kpi"><div className="label">Open high risks</div><div className="val" style={{ color: "#B0720A" }}>{p.total_open_risks}</div></div>
        <div className="kpi"><div className="label">Critical risks</div><div className="val" style={{ color: "#D4374C" }}>{p.total_critical}</div></div>
      </div>

      <div className="sec">All projects</div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))" }}>
        {p.projects.map((pr) => (
          <div className="card" key={pr.project_id} style={{ cursor: "pointer", borderTop: `3px solid ${RAG[pr.health.rag]}` }} onClick={() => onOpen(pr.project_id)}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="pill" style={{ background: "var(--tdim)", color: "var(--teal)" }}>{pr.terminal}</span>
              <span className="pill" style={{ background: RAG[pr.health.rag] + "22", color: RAG[pr.health.rag] }}>{pr.health.label}</span>
            </div>
            <div style={{ fontFamily: "var(--fh)", fontWeight: 700, fontSize: 15, color: "var(--ink)", margin: "10px 0 12px" }}>{pr.name}</div>
            <div className="ws-bar"><div className="ws-fill" style={{ width: pr.completion + "%", background: RAG[pr.health.rag] }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11, color: "var(--gray)" }}>
              <span><b style={{ color: "var(--ink)" }}>{pr.completion}%</b> complete</span>
              <span>{pr.open_risks} high · {pr.critical} crit</span>
              <span>Next: <b style={{ color: "var(--blue)" }}>{pr.next_gate}</b></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
