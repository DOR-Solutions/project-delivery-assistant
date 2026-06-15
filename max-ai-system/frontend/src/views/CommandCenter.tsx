import { useEffect, useState } from "react";
import { api, OpsSummary } from "../lib/api";
import { Bar } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const sev = (b: string) => ({ critical: "#D4374C", high: "#B0720A", medium: "#C9A227", low: "#178A43" }[b] || "#6B8093");

export default function CommandCenter({ pid }: { pid: string }) {
  const [s, setS] = useState<OpsSummary | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.opsSummary(pid).then(setS).catch((e) => setErr(String(e))); }, [pid]);
  if (err) return <div><h1>Command Center</h1><div className="card">Backend not reachable: {err}</div></div>;
  if (!s) return <div><h1>Command Center</h1><div className="card">Loading…</div></div>;

  const k = s.kpis;
  const kpis = [
    ["Bags today", k.bags.toLocaleString(), "#009E84"],
    ["Utilisation", k.utilisation + "%", k.utilisation >= 85 ? "#D4374C" : "#178A43"],
    ["Plan adherence", k.adherence + "%", "#2F62C4"],
    ["Open high risks", k.open_high, k.critical > 0 ? "#D4374C" : "#B0720A"],
  ];
  const bandCounts = ["critical", "high", "medium", "low"].map((b) => s.risks.filter((r) => r.band === b).length);
  return (
    <div>
      <h1>Command Center</h1>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
        {kpis.map(([l, v, c]) => (
          <div className="card kpi" key={l as string}>
            <div className="label">{l}</div><div className="val" style={{ color: c as string }}>{v}</div>
          </div>
        ))}
      </div>
      <div className="sec">Risk distribution</div>
      <div className="card" style={{ maxWidth: 520 }}>
        <Bar data={{ labels: ["Critical", "High", "Medium", "Low"], datasets: [{ data: bandCounts, backgroundColor: ["#D4374C", "#B0720A", "#C9A227", "#178A43"], borderRadius: 4 }] }}
          options={{ plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }} height={120} />
      </div>
      <div className="sec">MAX daily to-do ({s.tasks.length})</div>
      <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
        {s.tasks.map((t) => (
          <div className="card" key={t.id} style={{ borderLeft: `3px solid ${sev(t.pri)}`, padding: "11px 14px" }}>
            <span className="pill" style={{ background: sev(t.pri) + "22", color: sev(t.pri) }}>{t.pri}</span>
            <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: 5 }}>{t.text}</div>
            <div style={{ fontSize: 11, color: "var(--light)" }}>{t.detail}</div>
            <div style={{ fontSize: 10, color: "var(--gray)", fontFamily: "var(--fm)" }}>Owner: {t.owner}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
