import { useEffect, useState } from "react";
import { api, RosterOut } from "../lib/api";
import { Bar, Doughnut } from "react-chartjs-2";
import {
  Chart, ArcElement, BarElement, LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
} from "chart.js";
Chart.register(ArcElement, BarElement, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

const ZC = ["#0E7C86", "#2F62C4", "#B0720A", "#178A43", "#8A4FBE", "#C9A227", "#D4374C", "#6B8093"];
const ROLEC: Record<string, string> = { Operative: "#0E7C86", "Team Leader": "#B0720A", "Customer Service": "#2F62C4" };

export default function Roster() {
  const [d, setD] = useState<RosterOut | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.roster().then(setD).catch((e) => setErr(String(e))); }, []);

  if (err) return <Shell><div className="card">Backend not reachable: {err}</div></Shell>;
  if (!d) return <Shell><div className="card">Loading roster…</div></Shell>;

  const s = d.summary;
  const f0 = (n = 0) => "£" + Math.round(n).toLocaleString();
  const f2 = (n = 0) => "£" + n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const kpis: [string, string, string][] = [
    ["Committed cost (MTD)", f2(s.total_cost), "#10283B"],
    ["Shifts rostered", `${s.shifts.toLocaleString()} · ${s.total_hours.toLocaleString()} hrs`, "#2F62C4"],
    ["Unique resources", String(s.headcount), "#0E7C86"],
    ["Avg cost / op-day", f0(s.avg_daily_cost), "#B0720A"],
    ["Projected full month", f0(s.projected_month_cost), "#D4374C"],
    ["Blended rate", `${f2(s.avg_hourly_rate)}/hr`, "#178A43"],
  ];

  return (
    <Shell>
      {/* budget projection banner */}
      <div className="card" style={{ borderLeft: "4px solid #D4374C", marginBottom: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontSize: 13 }}>
          <span className="pill" style={{ background: "#D4374C22", color: "#D4374C", fontSize: 12 }}>Budget projection</span>
          <span>
            <b>{s.operating_days}</b> operating days ({s.date_from} → {s.date_to}) have committed <b>{f2(s.total_cost)}</b> of
            UMP mitigation labour. At the current cadence (<b>{f0(s.avg_daily_cost)}</b>/op-day, ~{s.avg_daily_headcount} staff/day),
            June is forecast at <b style={{ color: "#D4374C" }}>{f0(s.projected_month_cost)}</b> ({s.projected_op_days} op-days) —
            <b> {f0(s.annualised_cost)}</b> annualised if the mitigation continues.
          </span>
        </div>
      </div>

      <div className="kpis">
        {kpis.map(([l, v, c]) => (
          <div className="kpi" key={l}><div className="label">{l}</div><div className="val" style={{ color: c, fontSize: 20 }}>{v}</div></div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 320px", marginTop: 14 }}>
        {/* cost by zone */}
        <div className="card">
          <div className="panel-h">Deployment & cost by zone</div>
          {d.by_zone.map((z, i) => (
            <div className="ws-row" key={z.name}>
              <div className="top">
                <span><b>{z.name}</b> <span style={{ color: "var(--gray)", fontFamily: "var(--fm)", fontSize: 10 }}>{z.headcount} staff · {z.shifts} shifts · {z.hours.toLocaleString()} hrs</span></span>
                <b>{f0(z.cost)} <span style={{ color: "var(--gray)", fontWeight: 400 }}>({z.pct_cost}%)</span></b>
              </div>
              <div className="ws-bar"><div className="ws-fill" style={{ width: z.pct_cost + "%", background: ZC[i % ZC.length] }} /></div>
            </div>
          ))}
        </div>

        {/* role split */}
        <div className="card">
          <div className="panel-h">Cost by role</div>
          <div style={{ maxWidth: 210, margin: "0 auto" }}>
            <Doughnut
              data={{ labels: d.by_role.map((r) => r.name), datasets: [{ data: d.by_role.map((r) => r.cost), backgroundColor: d.by_role.map((r) => ROLEC[r.name] || "#6B8093"), borderWidth: 0 }] }}
              options={{ cutout: "66%", plugins: { legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 10 } } } }}
            />
          </div>
          <table style={{ marginTop: 10, fontSize: 12 }}>
            <tbody>
              {d.by_role.map((r) => (
                <tr key={r.name} style={{ borderBottom: "1px solid var(--bor)" }}>
                  <td style={{ padding: "4px 0" }}><span style={{ color: ROLEC[r.name] || "#6B8093" }}>●</span> {r.name}</td>
                  <td style={{ textAlign: "right", color: "var(--gray)" }}>{r.headcount}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{f0(r.cost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* daily staffing & cost */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="panel-h">Daily staffing & spend</div>
        <div style={{ height: 260 }}>
          <Bar
            data={{
              labels: d.daily.map((x) => x.date.slice(5) + " " + x.day),
              datasets: [
                { type: "bar", label: "Cost (£)", data: d.daily.map((x) => x.cost), backgroundColor: "#0E7C86", yAxisID: "y", borderRadius: 3 },
                { type: "line", label: "Headcount", data: d.daily.map((x) => x.headcount), borderColor: "#D4374C", backgroundColor: "#D4374C", yAxisID: "y1", tension: 0.3, pointRadius: 2 },
              ],
            } as any}
            options={{
              maintainAspectRatio: false,
              plugins: { legend: { position: "top", labels: { font: { size: 11 }, boxWidth: 12 } } },
              scales: {
                y: { position: "left", title: { display: true, text: "£ / day" }, ticks: { font: { size: 10 } } },
                y1: { position: "right", title: { display: true, text: "staff" }, grid: { drawOnChartArea: false }, ticks: { font: { size: 10 } } },
                x: { ticks: { font: { size: 9 }, maxRotation: 60, minRotation: 60 } },
              },
            }}
          />
        </div>
      </div>

      {/* top resources */}
      <div className="card" style={{ marginTop: 14 }}>
        <div className="panel-h">Top resources by committed cost</div>
        <table style={{ fontSize: 12.5 }}>
          <thead><tr><th>Resource</th><th>Shifts</th><th>Hours</th><th>Zones</th><th>Rate</th><th>Cost</th></tr></thead>
          <tbody>
            {d.top_staff.map((p) => (
              <tr key={p.employee}>
                <td style={{ fontWeight: 600 }}>{p.employee}</td>
                <td>{p.shifts}</td>
                <td>{p.hours.toLocaleString()}</td>
                <td>{p.zones}</td>
                <td style={{ color: "var(--gray)" }}>{f2(p.rate)}</td>
                <td style={{ fontWeight: 700 }}>{f0(p.cost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow">Workspace · cost code HAL-Q-647 · Terminal 5</div>
      <h1>👷 UMP Roster — T5 PILZ Mitigation</h1>
      <p style={{ color: "var(--gray)", maxWidth: 920, marginBottom: 8 }}>
        Front-of-house manual mitigation crews deployed to cover the T5 PILZ baggage outages — drawn live from the
        Deputy monthly roster. Shows the deployment plan (resource by zone, role and shift) and the committed &
        projected cost for resource planning and budgeting.
      </p>
      {children}
    </div>
  );
}
