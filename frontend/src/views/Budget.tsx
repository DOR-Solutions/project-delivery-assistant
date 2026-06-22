import { useEffect, useState } from "react";
import { api, BudgetOut } from "../lib/api";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

const RAG: Record<string, string> = { green: "#178A43", amber: "#B0720A", red: "#D4374C" };
const supColor = (s: string) => (s === "over" ? "#D4374C" : s === "high" ? "#B0720A" : "#178A43");

export default function Budget({ pid }: { pid: string }) {
  const [b, setB] = useState<BudgetOut | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { setB(null); setErr(""); api.budget(pid).then(setB).catch((e) => setErr(String(e))); }, [pid]);

  if (err) return <div><div className="eyebrow">Workspace</div><h1>Budget</h1><div className="card">Backend not reachable: {err}</div></div>;
  if (!b) return <div><div className="eyebrow">Workspace</div><h1>Budget</h1><div className="card">Loading…</div></div>;
  if (!b.has_budget) return <div><div className="eyebrow">Workspace</div><h1>Budget — {b.name}</h1><div className="card">No budget submitted for this project yet.</div></div>;

  const cur = b.currency || "£";
  const fmt = (n = 0) => cur + n.toLocaleString();
  const rag = b.rag || "amber";
  const kpis: [string, string, string][] = [
    ["Submitted budget", fmt(b.bac), "#10283B"],
    ["Spent to date", `${fmt(b.ac)} · ${b.pct_spent}%`, "#2F62C4"],
    ["Forecast out-turn", fmt(b.eac), RAG[rag]],
    [(b.vac ?? 0) < 0 ? "Forecast overspend" : "Forecast underspend", fmt(Math.abs(b.vac ?? 0)), (b.vac ?? 0) < 0 ? "#D4374C" : "#178A43"],
    ["Cost performance (CPI)", String(b.cpi), (b.cpi ?? 1) >= 1 ? "#178A43" : "#D4374C"],
    ["Progress vs spend", `${b.completion}% / ${b.pct_spent}%`, (b.completion ?? 0) >= (b.pct_spent ?? 0) ? "#178A43" : "#B0720A"],
  ];

  return (
    <div>
      <div className="eyebrow">Workspace · cost & earned value</div>
      <h1>💷 Budget — {b.name}</h1>

      {/* verdict banner */}
      <div className="card" style={{ borderLeft: `4px solid ${RAG[rag]}`, marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <span className="pill" style={{ background: RAG[rag] + "22", color: RAG[rag], fontSize: 12 }}>{b.verdict}</span>
          <span style={{ fontSize: 13, color: "var(--ink)" }}>
            At the current burn rate (CPI {b.cpi}), {b.name} is forecast to finish at <b>{fmt(b.eac)}</b> against a
            submitted budget of <b>{fmt(b.bac)}</b> — {(b.vac ?? 0) < 0
              ? <b style={{ color: "#D4374C" }}>an uplift of {fmt(b.overspend)} would be required.</b>
              : <b style={{ color: "#178A43" }}>within budget ({fmt(Math.abs(b.vac ?? 0))} headroom).</b>}
          </span>
        </div>
      </div>

      <div className="kpis">
        {kpis.map(([l, v, c]) => (
          <div className="kpi" key={l}><div className="label">{l}</div><div className="val" style={{ color: c, fontSize: 20 }}>{v}</div></div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "300px 1fr", marginTop: 14 }}>
        <div className="card">
          <div className="panel-h">Spend vs budget</div>
          <div style={{ maxWidth: 200, margin: "0 auto", position: "relative" }}>
            <Doughnut
              data={{ labels: ["Spent", "Remaining"], datasets: [{ data: [b.ac, Math.max(0, (b.bac ?? 0) - (b.ac ?? 0))], backgroundColor: [RAG[rag], "#D8E1E8"], borderWidth: 0 }] }}
              options={{ cutout: "72%", plugins: { legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 10 } } } }}
            />
          </div>
          <div className="donut-sub">{b.pct_spent}% of budget spent at {b.completion}% complete</div>
        </div>

        <div className="card">
          <div className="panel-h">Supplier breakdown</div>
          {b.mitigation_included && (
            <div style={{ fontSize: 12, color: "var(--gray)", marginBottom: 10, padding: "6px 10px", background: "var(--bg)", borderRadius: 8, borderLeft: "3px solid #0E7C86" }}>
              🪪 Includes the <b>ABC UMP manual-mitigation</b> charge, costed live from the roster on the ABC rate card (day/night split) — committed-to-date as spend, projected full month as allocation.
            </div>
          )}
          {(b.suppliers || []).map((sp) => (
            <div className="ws-row" key={sp.name}>
              <div className="top">
                <span>{sp.name}{sp.source === "roster" && <span className="pill" style={{ background: "#0E7C8622", color: "#0E7C86", fontSize: 9, marginLeft: 6 }}>live · roster</span>} <span style={{ color: "var(--gray)", fontFamily: "var(--fm)", fontSize: 10 }}>{fmt(sp.spent)} / {fmt(sp.budget)}</span></span>
                <b style={{ color: supColor(sp.status) }}>{sp.pct_spent}%</b>
              </div>
              <div className="ws-bar"><div className="ws-fill" style={{ width: Math.min(100, sp.pct_spent) + "%", background: sp.source === "roster" ? "#0E7C86" : supColor(sp.status) }} /></div>
            </div>
          ))}
          <table style={{ marginTop: 12 }}>
            <thead><tr><th>Supplier</th><th>Budget</th><th>Spent</th><th>Remaining</th><th>Status</th></tr></thead>
            <tbody>
              {(b.suppliers || []).map((sp) => (
                <tr key={sp.name}>
                  <td style={{ fontWeight: 600 }}>{sp.name}{sp.source === "roster" && <span className="pill" style={{ background: "#0E7C8622", color: "#0E7C86", fontSize: 9, marginLeft: 6 }}>UMP</span>}</td>
                  <td>{fmt(sp.budget)}</td>
                  <td>{fmt(sp.spent)}</td>
                  <td style={{ color: sp.remaining < 0 ? "#D4374C" : "var(--ink)" }}>{fmt(sp.remaining)}</td>
                  <td><span className="pill" style={{ background: supColor(sp.status) + "22", color: supColor(sp.status) }}>{sp.status === "over" ? "over budget" : sp.status === "high" ? "≥90%" : "on track"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
