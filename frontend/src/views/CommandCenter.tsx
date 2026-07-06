import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, Summary, WhatIfOut, RosterSummary } from "../lib/api";
import { Doughnut, Line } from "react-chartjs-2";
import {
  Chart, CategoryScale, LinearScale, BarElement, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler,
} from "chart.js";
Chart.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Filler);

const RAG = { green: "#178A43", amber: "#B0720A", red: "#D4374C" } as const;
const sev = (b: string) => ({ critical: "#D4374C", high: "#B0720A", medium: "#C9A227", low: "#178A43" }[b] || "#6B8093");
const wsColor = (p: number) => (p >= 75 ? "#178A43" : p >= 45 ? "#B0720A" : "#D4374C");

export default function CommandCenter({ pid }: { pid: string }) {
  const nav = useNavigate();
  const [s, setS] = useState<Summary | null>(null);
  const [mit, setMit] = useState<RosterSummary | null>(null);
  const [err, setErr] = useState("");
  const [win, setWin] = useState(7);

  // what-if state
  const [vol, setVol] = useState(100);
  const [crew, setCrew] = useState(0);
  const [extra, setExtra] = useState(0);
  const [wf, setWf] = useState<WhatIfOut | null>(null);

  useEffect(() => {
    setErr(""); setS(null);
    setMit(null);
    api.summary(pid).then((d) => {
      setS(d); setCrew(d.crew_on_shift || d.crew_baseline || 0);
      if (d.terminal === "T5") api.roster().then((r) => setMit(r.summary)).catch(() => {});
    }).catch((e) => setErr(String(e)));
  }, [pid]);

  useEffect(() => {
    if (!s) return;
    const t = setTimeout(() => api.whatif(pid, vol, crew, extra).then(setWf).catch(() => {}), 120);
    return () => clearTimeout(t);
  }, [pid, vol, crew, extra, s]);

  const bandCounts = useMemo(() => {
    const c = { critical: 0, high: 0, medium: 0, low: 0 } as Record<string, number>;
    s?.risks.forEach((r) => { c[r.band] = (c[r.band] || 0) + 1; });
    return c;
  }, [s]);

  if (err) return <div><div className="eyebrow">Command Center</div><h1>Project Intelligence</h1><div className="card">Backend not reachable: {err}</div></div>;
  if (!s) return <div><div className="eyebrow">Command Center</div><h1>Loading…</h1><div className="card">Loading project intelligence…</div></div>;

  const k = s.kpis;
  const kpis: [string, string | number, string, string][] = [
    ["Completion", k.completion + "%", RAG[s.health.rag], "view ↗"],
    ["Bags today", k.bags ? k.bags.toLocaleString() : "—", "#009E84", "view ↗"],
    ["Utilisation", k.utilisation ? k.utilisation + "%" : "—", k.utilisation >= 85 ? "#D4374C" : "#178A43", "view ↗"],
    ["Open risks", k.open_risks, k.critical > 0 ? "#D4374C" : "#B0720A", "view ↗"],
    ["Tasks today", k.tasks_today, "#7B36C9", "view ↗"],
    ["Next gate", k.next_gate, "#2F62C4", "view ↗"],
  ];

  const tp = s.throughput.slice(-win);
  const topRisks = s.risks.slice(0, 4);

  return (
    <div>
      <div className="eyebrow">Command Center</div>
      <h1><span className="title-star">★</span> {s.name}</h1>

      <div className="kpis">
        {kpis.map(([l, v, c, link]) => (
          <div className="kpi" key={l}>
            <div className="label">{l}</div>
            <div className="val" style={{ color: c }}>{v}</div>
            <div className="view">{link}</div>
          </div>
        ))}
      </div>

      {mit && (
        <div className="card" onClick={() => nav("/roster")} title="Open the UMP roster"
          style={{ marginTop: 12, cursor: "pointer", borderLeft: "4px solid #0E7C86", display: "flex", alignItems: "center", gap: 22, flexWrap: "wrap" }}>
          <span className="pill" style={{ background: "#0E7C8622", color: "#0E7C86", fontSize: 12 }}>🪪 Manual mitigation (UMP) · T5 PILZ</span>
          <Stat label="Charge cost (MTD, ABC)" val={"£" + Math.round(mit.total_charge).toLocaleString()} color="#10283B" />
          <Stat label="Staff deployed" val={String(mit.headcount)} color="#0E7C86" />
          <Stat label="Hours rostered" val={mit.total_hours.toLocaleString()} color="#2F62C4" />
          <Stat label={`Forecast (${mit.days_in_month}d month)`} val={"£" + Math.round(mit.projected_month_charge).toLocaleString()} color="#D4374C" />
          <span style={{ marginLeft: "auto", fontSize: 12, color: "var(--gray)" }}>
            {mit.operating_days} op-days · {mit.date_from} → {mit.date_to} <span style={{ color: "var(--teal)" }}>open ↗</span>
          </span>
        </div>
      )}

      {s.actions && (
        <div className="card" onClick={() => nav("/meetings")} title="Open Meetings → Actions & Progress"
          style={{ marginTop: 12, cursor: "pointer", borderLeft: "4px solid #7B36C9" }}>
          <div className="panel-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span>✅ Meeting-driven actions & progress</span>
            <span style={{ fontSize: 12, color: "var(--gray)" }}>{s.actions.closed}/{s.actions.total} closed · {s.actions.open} open · {s.actions.overdue} overdue <span style={{ color: "var(--teal)" }}>open ↗</span></span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "230px 1fr", gap: 20, marginTop: 8 }}>
            <div>
              <Stat label="Programme progress (incl. actions)" val={(s.completion_combined ?? s.completion) + "%"} color="#7B36C9" />
              <div style={{ fontSize: 11, color: "var(--gray)", margin: "6px 0 8px" }}>Delivery {s.completion}% (×0.8) + actions {s.actions.progress_pct}% (×0.2)</div>
              <ProgressBar label="Delivery" pct={s.completion} color="#0E7C86" />
              <ProgressBar label="Meeting actions" pct={s.actions.progress_pct} color="#7B36C9" />
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--gray)", textTransform: "uppercase", letterSpacing: .4, marginBottom: 6 }}>Planned next actions</div>
              {s.actions.planned.map((t) => (
                <div key={t.id} style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12.5, padding: "3px 0", borderBottom: "1px solid var(--bor)" }}>
                  <span className="pill" style={{ background: "var(--tdim)", color: "var(--teal)", fontSize: 9 }}>{t.workstream}</span>
                  <span style={{ flex: 1 }}>{t.text}</span>
                  <span style={{ color: "var(--gray)", whiteSpace: "nowrap" }}>{t.owner}</span>
                  {t.overdue && <span style={{ color: "#D4374C", fontWeight: 700 }}>⚠</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid" style={{ gridTemplateColumns: "320px 1fr", marginTop: 14 }}>
        <div className="card">
          <div className="panel-h">Overall Health</div>
          <div className="donut-wrap">
            <Doughnut
              data={{ labels: ["Complete", "Remaining"], datasets: [{ data: [s.completion, 100 - s.completion], backgroundColor: [RAG[s.health.rag], "#D8E1E8"], borderWidth: 0 }] }}
              options={{ cutout: "74%", plugins: { legend: { display: false }, tooltip: { enabled: false } } }}
              height={200}
            />
            <div className="donut-center">
              <div className="donut-pct">{s.completion}%</div>
              <div className="donut-rag" style={{ color: RAG[s.health.rag] }}>{s.health.label}</div>
            </div>
          </div>
          <div className="donut-sub">{s.milestones.on_track}/{s.milestones.total} milestones on track</div>
        </div>

        <div className="card">
          <div className="panel-h" style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Bag throughput — planned vs actual</span>
            <span>{[7, 14, 21].map((d) => (
              <button key={d} onClick={() => setWin(d)} className="pill" style={{ cursor: "pointer", marginLeft: 4, border: "1px solid var(--bor)", background: win === d ? "var(--tdim)" : "transparent", color: win === d ? "var(--teal)" : "var(--gray)" }}>{d}d</button>
            ))}</span>
          </div>
          {tp.length ? (
            <Line
              data={{
                labels: tp.map((d) => d.date.slice(5)),
                datasets: [
                  { label: "Actual", data: tp.map((d) => d.actual), borderColor: "#009E84", backgroundColor: "rgba(0,158,132,.12)", fill: true, tension: 0.3, pointRadius: 0 },
                  { label: "Planned", data: tp.map((d) => d.planned), borderColor: "#2F62C4", borderDash: [5, 4], fill: false, tension: 0.3, pointRadius: 0 },
                ],
              }}
              options={{ plugins: { legend: { labels: { font: { size: 10 }, boxWidth: 12 } } }, scales: { y: { beginAtZero: false } } }}
              height={150}
            />
          ) : <div style={{ color: "var(--gray)", padding: 30, textAlign: "center" }}>No throughput data for this project.</div>}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr 1.1fr", marginTop: 12 }}>
        <div className="card">
          <div className="panel-h">Risk distribution</div>
          <div style={{ maxWidth: 200, margin: "0 auto" }}>
            <Doughnut
              data={{ labels: ["Critical", "High", "Medium", "Low"], datasets: [{ data: [bandCounts.critical, bandCounts.high, bandCounts.medium, bandCounts.low], backgroundColor: ["#D4374C", "#B0720A", "#C9A227", "#178A43"], borderWidth: 0 }] }}
              options={{ cutout: "60%", plugins: { legend: { position: "bottom", labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } } } }}
            />
          </div>
        </div>

        <div className="card">
          <div className="panel-h">Workstream completion</div>
          {s.workstreams.map((w) => (
            <div className="ws-row" key={w.name}>
              <div className="top"><span>{w.name}</span><b>{w.pct}%</b></div>
              <div className="ws-bar"><div className="ws-fill" style={{ width: w.pct + "%", background: wsColor(w.pct) }} /></div>
            </div>
          ))}
        </div>

        <div className="card">
          <div className="panel-h">Gate progression (G0–G8)</div>
          <div className="gates">
            {s.gates.stages.map((g) => (
              <div className={"gate " + g.status} key={g.gate} title={g.label}>
                <div className="g">{g.gate}</div>
                <div className="gl">{g.label}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: "var(--gray)" }}>
            Next gate: <b style={{ color: "var(--blue)" }}>{s.gates.next}</b> — {s.gates.next_label}
          </div>
        </div>
      </div>

      {/* What-if simulator */}
      <div className="whatif">
        <div className="whatif-h">
          <div className="t">⊟ What-if scenario simulator</div>
          <div className="hint">drag to model — recalculates live</div>
        </div>
        <div className="sliders">
          <div className="slider">
            <label>Bag volume <b>{vol}% of plan</b></label>
            <input type="range" min={50} max={140} value={vol} onChange={(e) => setVol(+e.target.value)} />
          </div>
          <div className="slider">
            <label>Crew on shift <b>{crew}</b></label>
            <input type="range" min={Math.max(4, Math.round((s.crew_baseline || 20) * 0.4))} max={Math.round((s.crew_baseline || 20) * 1.8) || 60} value={crew} onChange={(e) => setCrew(+e.target.value)} />
          </div>
          <div className="slider">
            <label>Extra completion <b>+{extra}%</b></label>
            <input type="range" min={0} max={20} value={extra} onChange={(e) => setExtra(+e.target.value)} />
          </div>
        </div>
        <div className="wf-out">
          <div className="wf-card"><div className="l">Utilisation</div><div className="v" style={{ color: (wf?.utilisation ?? 0) >= 85 ? "#B0720A" : "#178A43" }}>{wf ? wf.utilisation + "%" : "—"}</div></div>
          <div className="wf-card"><div className="l">Projected completion</div><div className="v" style={{ color: "#178A43" }}>{wf ? wf.projected_completion + "%" : "—"}</div></div>
          <div className="wf-card"><div className="l">Risk index</div><div className="v" style={{ color: wf?.risk_index === "High" ? "#D4374C" : wf?.risk_index === "Medium" ? "#B0720A" : "#178A43" }}>{wf?.risk_index ?? "—"}</div></div>
          <div className="wf-card"><div className="l">SAT date shift</div><div className="v" style={{ color: (wf?.sat_date_shift ?? 0) > 0 ? "#D4374C" : "#178A43" }}>{wf ? (wf.sat_date_shift > 0 ? "+" : "") + wf.sat_date_shift + "d" : "—"}</div></div>
        </div>
      </div>

      <div className="two-col" style={{ marginTop: 18 }}>
        <div>
          <div className="sec">Top risks</div>
          {topRisks.length ? topRisks.map((r) => (
            <div className="row-card" key={r.id} style={{ borderLeftColor: sev(r.band) }}>
              <span className="pill" style={{ background: sev(r.band) + "22", color: sev(r.band) }}>{r.band} · {r.score}</span>
              <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: 5 }}>{r.title}</div>
            </div>
          )) : <div className="card">No open risks.</div>}
        </div>
        <div>
          <div className="sec">Today's top tasks</div>
          {s.tasks.length ? s.tasks.slice(0, 4).map((t) => (
            <div className="row-card" key={t.id} style={{ borderLeftColor: sev(t.pri) }}>
              <span className="pill" style={{ background: sev(t.pri) + "22", color: sev(t.pri) }}>{t.pri}</span>
              <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: 5 }}>{t.text}</div>
              <div style={{ fontSize: 11, color: "var(--gray)", fontFamily: "var(--fm)", marginTop: 3 }}>Owner: {t.owner}</div>
            </div>
          )) : <div className="card">No tasks queued.</div>}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, val, color }: { label: string; val: string; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: .4, color: "var(--gray)" }}>{label}</div>
      <div style={{ fontFamily: "var(--fh)", fontWeight: 800, fontSize: 19, color }}>{val}</div>
    </div>
  );
}

function ProgressBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 2 }}><span>{label}</span><b>{pct}%</b></div>
      <div style={{ height: 7, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: Math.min(100, pct) + "%", height: "100%", background: color }} />
      </div>
    </div>
  );
}
