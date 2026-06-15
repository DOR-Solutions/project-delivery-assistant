import { useEffect, useState } from "react";
import { api, PortfolioOut } from "../lib/api";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

const RAG: Record<string, string> = { green: "#178A43", amber: "#B0720A", red: "#D4374C" };

export default function Dashboard({ onOpen }: { onOpen: (pid: string) => void }) {
  const [p, setP] = useState<PortfolioOut | null>(null);
  useEffect(() => { api.portfolio().then(setP).catch(() => {}); }, []);
  if (!p) return <div><div className="eyebrow">Workspace</div><h1>Dashboard</h1><div className="card">Loading…</div></div>;

  const ranked = [...p.projects].sort((a, b) => a.completion - b.completion);

  return (
    <div>
      <div className="eyebrow">Workspace</div>
      <h1>Executive Dashboard</h1>

      <div className="grid" style={{ gridTemplateColumns: "300px 1fr", marginTop: 14 }}>
        <div className="card">
          <div className="panel-h">Portfolio RAG</div>
          <div style={{ maxWidth: 200, margin: "0 auto" }}>
            <Doughnut
              data={{ labels: ["Green", "Amber", "Red"], datasets: [{ data: [p.rag_counts.green, p.rag_counts.amber, p.rag_counts.red], backgroundColor: [RAG.green, RAG.amber, RAG.red], borderWidth: 0 }] }}
              options={{ cutout: "62%", plugins: { legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } } } }}
            />
          </div>
          <div className="donut-sub">Avg completion <b style={{ color: "var(--ink)" }}>{p.avg_completion}%</b></div>
        </div>

        <div className="card">
          <div className="panel-h">Delivery confidence — by project (lowest first)</div>
          {ranked.map((pr) => (
            <div className="ws-row" key={pr.project_id} style={{ cursor: "pointer" }} onClick={() => onOpen(pr.project_id)}>
              <div className="top">
                <span><span className="pill" style={{ background: "var(--tdim)", color: "var(--teal)", marginRight: 6 }}>{pr.terminal}</span>{pr.name}</span>
                <b style={{ color: RAG[pr.health.rag] }}>{pr.completion}%</b>
              </div>
              <div className="ws-bar"><div className="ws-fill" style={{ width: pr.completion + "%", background: RAG[pr.health.rag] }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 14 }}>
        <div className="kpi"><div className="label">Projects</div><div className="val">{p.projects.length}</div></div>
        <div className="kpi"><div className="label">Open high risks</div><div className="val" style={{ color: "#B0720A" }}>{p.total_open_risks}</div></div>
        <div className="kpi"><div className="label">Critical risks</div><div className="val" style={{ color: "#D4374C" }}>{p.total_critical}</div></div>
      </div>
    </div>
  );
}
