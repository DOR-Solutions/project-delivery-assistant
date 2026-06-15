import { useEffect, useState } from "react";
import { api, Forecast as FC } from "../lib/api";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler } from "chart.js";
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler);

const win = (t: string) => t === "C" ? { c: "#178A43", l: "IDEAL" } : t === "B" ? { c: "#B0720A", l: "WORKABLE" } : { c: "#D4374C", l: "AVOID" };

export default function Forecast({ pid }: { pid: string }) {
  const [f, setF] = useState<FC | null>(null);
  useEffect(() => { api.forecast(pid).then(setF).catch(() => {}); }, [pid]);
  if (!f) return <div><h1>Bag Forecast</h1><div className="card">Loading…</div></div>;
  return (
    <div>
      <h1>Bag Forecast — T5 Directs & Manual Mitigation</h1>
      <div className="card">
        <Line data={{ labels: f.directs.map((d) => d.date.slice(5)), datasets: [
          { label: "MAX forecast", data: f.directs.map((d) => d.max), borderColor: "#B0720A", borderDash: [6, 4], fill: false },
          { label: "PILZ plan", data: f.directs.map((d) => d.plan), borderColor: "#2F62C4", borderDash: [2, 3], fill: false },
        ] }} options={{ plugins: { legend: { labels: { font: { size: 10 } } } } }} height={90} />
      </div>
      <div className="sec">T5 directs — coming days & PILZ work windows</div>
      <div className="card" style={{ padding: 0 }}>
        <table><thead><tr><th>Date</th><th>Day</th><th>MAX forecast</th><th>Plan</th><th>Type</th><th>Window</th></tr></thead>
          <tbody>{f.directs.map((d) => { const w = win(d.type); return (
            <tr key={d.date}><td style={{ fontFamily: "var(--fm)" }}>{d.date.slice(5)}</td><td>{d.day}</td>
              <td style={{ fontWeight: 700 }}>{Math.round(d.max).toLocaleString()}</td><td style={{ color: "var(--gray)" }}>{d.plan.toLocaleString()}</td>
              <td><span className="pill" style={{ background: w.c + "22", color: w.c }}>{d.type}</span></td>
              <td><span className="pill" style={{ background: w.c + "22", color: w.c }}>{w.l}</span></td></tr>); })}
          </tbody></table>
      </div>
      <div className="sec">Manual mitigation — forecast (~{f.mitigation.avg_total.toLocaleString()}/day)</div>
      <div className="card" style={{ padding: 0 }}>
        <table><thead><tr><th>Date</th><th>Day</th><th>FOH Zone E</th><th>Zone C/D/F</th><th>MIP</th><th>Total</th></tr></thead>
          <tbody>{f.mitigation.fc.map((m) => (
            <tr key={m.date}><td style={{ fontFamily: "var(--fm)" }}>{m.date.slice(5)}</td><td>{m.day}</td>
              <td>{m.foh.toLocaleString()}</td><td>{m.cdf.toLocaleString()}</td><td>{m.mip.toLocaleString()}</td>
              <td style={{ fontWeight: 700 }}>{m.total.toLocaleString()}</td></tr>))}
          </tbody></table>
      </div>
    </div>
  );
}
