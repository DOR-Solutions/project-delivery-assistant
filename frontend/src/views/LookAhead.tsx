import { useEffect, useMemo, useState } from "react";
import { api, LookAheadOut, LookAheadActivity } from "../lib/api";

const STATUS = { critical: "#D4374C", slipping: "#B0720A", on_track: "#178A43" } as const;
const sc = (s: string) => (STATUS as any)[s] || "#6B8093";
const dlabel = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });

export default function LookAhead({ pid }: { pid: string }) {
  const [d, setD] = useState<LookAheadOut | null>(null);
  const [err, setErr] = useState("");
  const [weeks, setWeeks] = useState(6);
  const [status, setStatus] = useState("all");
  const [disc, setDisc] = useState("all");

  useEffect(() => { setD(null); setErr(""); api.lookahead(pid, weeks).then(setD).catch((e) => setErr(String(e))); }, [pid, weeks]);

  const t0 = d ? new Date(d.summary.as_of).getTime() : 0;
  const t1 = d ? new Date(d.summary.window_end).getTime() : 1;
  const span = Math.max(1, t1 - t0);
  const pos = (s: string, f: string) => {
    const a = Math.max(t0, new Date(s).getTime()), b = Math.min(t1, new Date(f).getTime());
    return { left: ((a - t0) / span) * 100, width: Math.max(1.5, ((b - a) / span) * 100) };
  };
  const blPos = (bl: string) => ((Math.min(t1, Math.max(t0, new Date(bl).getTime())) - t0) / span) * 100;

  const groups = useMemo(() => {
    if (!d) return [];
    return d.wbs_groups
      .map((g) => ({ ...g, activities: g.activities.filter((a) => (status === "all" || a.status === status) && (disc === "all" || a.discipline === disc)) }))
      .filter((g) => g.activities.length);
  }, [d, status, disc]);

  if (err) return <div><div className="eyebrow">Workspace</div><h1>Look-Ahead</h1><div className="card">Backend not reachable: {err}</div></div>;
  if (!d) return <div><div className="eyebrow">Workspace</div><h1>Look-Ahead</h1><div className="card">Loading schedule…</div></div>;
  const s = d.summary;

  const row = (a: LookAheadActivity) => {
    const p = pos(a.start, a.finish);
    return (
      <tr key={a.id}>
        <td style={{ fontFamily: "var(--fm)", fontSize: 11 }}>{a.id}</td>
        <td><div style={{ fontWeight: 600 }}>{a.name}</div>
          {a.preds.length > 0 && <div style={{ fontSize: 10, color: "var(--gray)", fontFamily: "var(--fm)" }}>← {a.preds.join(", ")}</div>}</td>
        <td>{a.pct}%</td>
        <td style={{ fontFamily: "var(--fm)" }}>{dlabel(a.finish)}</td>
        <td style={{ color: a.total_float <= 0 ? "#D4374C" : "var(--gray)", fontWeight: a.total_float <= 0 ? 700 : 400 }}>{a.total_float}</td>
        <td style={{ color: a.variance_days < 0 ? "#D4374C" : "#178A43", fontWeight: 600 }}>{a.variance_days > 0 ? "+" : ""}{a.variance_days}d</td>
        <td><span className="pill" style={{ background: "var(--card2)", color: "var(--gray)" }}>{a.discipline}</span></td>
        <td style={{ minWidth: 180 }}>
          <div style={{ position: "relative", height: 16, background: "var(--card2)", borderRadius: 4 }}>
            <div style={{ position: "absolute", left: `${p.left}%`, width: `${p.width}%`, top: 3, height: 10, background: sc(a.status), borderRadius: 3 }} title={`${dlabel(a.start)} – ${dlabel(a.finish)}`} />
            <div style={{ position: "absolute", left: `calc(${blPos(a.bl_finish)}% - 1px)`, top: 0, height: 16, width: 2, background: "var(--ink)" }} title={`Baseline finish ${dlabel(a.bl_finish)}`} />
          </div>
        </td>
      </tr>
    );
  };

  return (
    <div>
      <div className="eyebrow">Workspace · schedule</div>
      <h1>📆 Look-Ahead — {d.name}</h1>
      <p style={{ color: "var(--gray)", maxWidth: 800, marginBottom: 10 }}>
        {s.weeks}-week look-ahead (activities &lt; 100% complete), mirroring the VI weekly review. Bars show start→finish;
        the vertical marker is the baseline finish. Critical-path and slipping activities feed Risk, Strategy and Foresight.
      </p>

      <div className="kpis" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        <div className="kpi"><div className="label">Activities in window</div><div className="val">{s.total}</div></div>
        <div className="kpi"><div className="label">Critical (float ≤ 0)</div><div className="val" style={{ color: "#D4374C" }}>{s.critical}</div></div>
        <div className="kpi"><div className="label">Slipping vs baseline</div><div className="val" style={{ color: "#B0720A" }}>{s.slipping}</div></div>
        <div className="kpi"><div className="label">On track</div><div className="val" style={{ color: "#178A43" }}>{s.on_track}</div></div>
        <div className="kpi"><div className="label">Worst slippage</div><div className="val" style={{ color: "#D4374C" }}>{s.worst_variance}d</div></div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0 6px", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "var(--gray)", fontFamily: "var(--fm)" }}>WINDOW</span>
        {[4, 6, 8, 12].map((w) => (
          <button key={w} onClick={() => setWeeks(w)} className="pill" style={{ cursor: "pointer", border: "1px solid var(--bor)", background: weeks === w ? "var(--tdim)" : "transparent", color: weeks === w ? "var(--teal)" : "var(--gray)" }}>{w}wk</button>
        ))}
        <span style={{ width: 12 }} />
        {["all", "critical", "slipping", "on_track"].map((st) => (
          <button key={st} onClick={() => setStatus(st)} className="pill" style={{ cursor: "pointer", border: "1px solid var(--bor)", background: status === st ? sc(st) + "22" : "transparent", color: status === st ? sc(st) : "var(--gray)" }}>{st.replace("_", " ")}</button>
        ))}
        <span style={{ width: 12 }} />
        <button onClick={() => setDisc("all")} className="pill" style={{ cursor: "pointer", border: "1px solid var(--bor)", background: disc === "all" ? "var(--tdim)" : "transparent", color: disc === "all" ? "var(--teal)" : "var(--gray)" }}>all disc.</button>
        {Object.keys(d.disciplines).map((dd) => (
          <button key={dd} onClick={() => setDisc(dd)} className="pill" title={d.disciplines[dd]} style={{ cursor: "pointer", border: "1px solid var(--bor)", background: disc === dd ? "var(--tdim)" : "transparent", color: disc === dd ? "var(--teal)" : "var(--gray)" }}>{dd} ({s.by_discipline[dd] || 0})</button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: 11, color: "var(--gray)", fontFamily: "var(--fm)" }}>{dlabel(s.as_of)} → {dlabel(s.window_end)}</span>
      </div>

      {groups.map((g) => (
        <div key={g.wbs} style={{ marginTop: 14 }}>
          <div className="panel-h" style={{ marginBottom: 6 }}>{g.wbs}</div>
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table>
              <thead><tr><th>ID</th><th>Activity</th><th>%</th><th>Finish</th><th>Float</th><th>Var</th><th>Disc</th><th>Timeline (baseline ▏)</th></tr></thead>
              <tbody>{g.activities.map(row)}</tbody>
            </table>
          </div>
        </div>
      ))}
      {!groups.length && <div className="card">No activities match the current filters.</div>}
    </div>
  );
}
