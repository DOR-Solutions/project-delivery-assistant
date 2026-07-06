import { useEffect, useState } from "react";
import { api, ResourcesOut } from "../lib/api";
import { Bar } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from "chart.js";
Chart.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const PALETTE = ["#009E84", "#2F62C4", "#B0720A", "#7B36C9", "#D4374C", "#178A43", "#C9A227"];

export default function Resources({ pid }: { pid: string }) {
  const [d, setD] = useState<ResourcesOut | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { setD(null); setErr(""); api.resources(pid).then(setD).catch((e) => setErr(String(e))); }, [pid]);

  if (err) return <div><div className="eyebrow">Workspace</div><h1>Resource Management</h1><div className="card">Backend not reachable: {err}</div></div>;
  if (!d) return <div><div className="eyebrow">Workspace</div><h1>Resource Management</h1><div className="card">Loading…</div></div>;
  if (!d.has_resources) return <div><div className="eyebrow">Workspace</div><h1>Resource Management — {d.name}</h1><div className="card">No resource roster submitted for this project yet.</div></div>;

  const cur = d.currency || "£";
  const fmt = (n = 0) => cur + n.toLocaleString();
  const kpis: [string, string, string][] = [
    ["Total headcount", String(d.headcount), "#10283B"],
    ["Suppliers on site", String(d.suppliers), "#2F62C4"],
    ["Day rate (all)", fmt(d.daily_cost), "#009E84"],
    ["Weekly cost", fmt(d.weekly_cost), "#B0720A"],
    [`Projected (${d.weeks_remaining}wk to completion)`, fmt(d.projected_cost), "#D4374C"],
  ];

  return (
    <div>
      <div className="eyebrow">Workspace · resourcing</div>
      <h1>👷 Resource Management — {d.name}</h1>
      <p style={{ color: "var(--gray)", maxWidth: 780, marginBottom: 12 }}>
        Every supplier's resource on this project, with headcount and associated cost. Day-rates roll up to
        daily, weekly and projected-to-completion spend.
      </p>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        {kpis.map(([l, v, c]) => (
          <div className="kpi" key={l}><div className="label">{l}</div><div className="val" style={{ color: c, fontSize: 22 }}>{v}</div></div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 14 }}>
        <div className="card">
          <div className="panel-h">Headcount by supplier</div>
          <Bar
            data={{ labels: d.by_supplier.map((s) => s.supplier), datasets: [{ data: d.by_supplier.map((s) => s.headcount), backgroundColor: d.by_supplier.map((_, i) => PALETTE[i % PALETTE.length]), borderRadius: 4 }] }}
            options={{ indexAxis: "y", plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, ticks: { precision: 0 } } } }} height={150}
          />
        </div>
        <div className="card">
          <div className="panel-h">Daily cost by supplier</div>
          <Bar
            data={{ labels: d.by_supplier.map((s) => s.supplier), datasets: [{ data: d.by_supplier.map((s) => s.daily_cost), backgroundColor: d.by_supplier.map((_, i) => PALETTE[i % PALETTE.length]), borderRadius: 4 }] }}
            options={{ indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c: any) => cur + c.parsed.x.toLocaleString() + "/day" } } }, scales: { x: { beginAtZero: true } } }} height={150}
          />
        </div>
      </div>

      <div className="sec">By supplier</div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
        {d.by_supplier.map((s, i) => (
          <div className="card" key={s.supplier} style={{ borderTop: `3px solid ${PALETTE[i % PALETTE.length]}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div style={{ fontFamily: "var(--fh)", fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{s.supplier}</div>
              <div style={{ fontWeight: 800, color: "var(--ink)" }}>{s.headcount} <span style={{ fontSize: 11, color: "var(--gray)", fontWeight: 400 }}>ppl</span></div>
            </div>
            <div style={{ fontSize: 12, color: "var(--light)", margin: "6px 0" }}>{s.roles.join(" · ")}</div>
            <div style={{ fontFamily: "var(--fm)", fontSize: 12, color: "var(--teal)", fontWeight: 600 }}>{fmt(s.daily_cost)}/day</div>
          </div>
        ))}
      </div>

      <div className="sec">Resource roster</div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table>
          <thead><tr><th>Supplier</th><th>Role</th><th>Count</th><th>Day rate</th><th>Daily cost</th></tr></thead>
          <tbody>
            {d.lines.map((l, i) => (
              <tr key={i}>
                <td style={{ fontWeight: 600 }}>{l.supplier}</td>
                <td>{l.role}</td>
                <td style={{ fontFamily: "var(--fm)" }}>{l.count}</td>
                <td style={{ fontFamily: "var(--fm)" }}>{fmt(l.day_rate)}</td>
                <td style={{ fontFamily: "var(--fm)", fontWeight: 600 }}>{fmt(l.daily_cost)}</td>
              </tr>
            ))}
            <tr style={{ background: "var(--card2)" }}>
              <td style={{ fontWeight: 700 }}>Total</td><td></td>
              <td style={{ fontFamily: "var(--fm)", fontWeight: 700 }}>{d.headcount}</td><td></td>
              <td style={{ fontFamily: "var(--fm)", fontWeight: 700 }}>{fmt(d.daily_cost)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
