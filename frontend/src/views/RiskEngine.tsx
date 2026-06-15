import { useEffect, useState } from "react";
import { api, OpsSummary } from "../lib/api";

const sev = (b: string) => ({ critical: "#D4374C", high: "#B0720A", medium: "#C9A227", low: "#178A43" }[b] || "#6B8093");

export default function RiskEngine({ pid }: { pid: string }) {
  const [s, setS] = useState<OpsSummary | null>(null);
  const [filter, setFilter] = useState("all");
  useEffect(() => { api.opsSummary(pid).then(setS).catch(() => {}); }, [pid]);
  if (!s) return <div><h1>Risk Engine</h1><div className="card">Loading…</div></div>;
  const risks = s.risks.filter((r) => filter === "all" || r.band === filter);
  return (
    <div>
      <h1>Risk Engine</h1>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {["all", "critical", "high", "medium", "low"].map((b) => (
          <button key={b} onClick={() => setFilter(b)} className="pill"
            style={{ cursor: "pointer", padding: "5px 10px", border: "1px solid var(--bor)", background: filter === b ? "var(--tdim)" : "transparent", color: filter === b ? "var(--teal)" : "var(--gray)" }}>{b}</button>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        {risks.map((r) => (
          <div className="card" key={r.id} style={{ borderLeft: `4px solid ${sev(r.band)}` }}>
            <span className="pill" style={{ background: sev(r.band) + "22", color: sev(r.band) }}>{r.band} · {r.score}</span>
            <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--gray)", marginLeft: 8 }}>L{r.likelihood}×I{r.impact} · {r.area}</span>
            <div style={{ fontWeight: 600, color: "var(--ink)", margin: "6px 0" }}>{r.title}</div>
            <div style={{ fontSize: 12 }}><b>Mitigation:</b> {r.mitigation}</div>
            <div style={{ fontSize: 10, color: "var(--gray)", fontFamily: "var(--fm)", marginTop: 5 }}>Owner: {r.owner}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
