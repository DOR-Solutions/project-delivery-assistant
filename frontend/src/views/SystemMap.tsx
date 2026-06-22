import { useEffect, useMemo, useState } from "react";
import { api, SystemMapOut, MfdSim } from "../lib/api";

const W = 1040, H = 470, NW = 156, NH = 58, PAD = 46;
const SEV: Record<string, string> = { critical: "#D4374C", high: "#B0720A", medium: "#C9A227", low: "#178A43" };
const statusColor = (s: string) => (s === "commissioning" ? "#B0720A" : s === "out-of-service" ? "#D4374C" : "#178A43");
const utilColor = (u: number) => (u >= 100 ? "#D4374C" : u >= 90 ? "#B0720A" : "#178A43");

export default function SystemMap({ pid }: { pid: string }) {
  const [d, setD] = useState<SystemMapOut | null>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [sim, setSim] = useState<MfdSim | null>(null);

  useEffect(() => { setD(null); setErr(""); setSel(null); setSim(null); api.systemMap(pid).then(setD).catch((e) => setErr(String(e))); }, [pid]);

  const adj = useMemo(() => {
    const m: Record<string, string[]> = {};
    d?.edges.forEach((e) => { (m[e.from] ||= []).push(e.to); });
    return m;
  }, [d]);

  const impacted = useMemo(() => {
    if (!sel) return new Set<string>();
    const out = new Set<string>(); const stack = [...(adj[sel] || [])];
    while (stack.length) { const n = stack.pop()!; if (!out.has(n)) { out.add(n); (adj[n] || []).forEach((x) => stack.push(x)); } }
    return out;
  }, [sel, adj]);

  const rerouteIds = useMemo(() => new Set((sim?.reroute || []).map((r) => r.id)), [sim]);

  const pos = useMemo(() => {
    const p: Record<string, { x: number; y: number }> = {};
    if (!d) return p;
    const screen = d.nodes.filter((n) => n.id !== "MAKEUP" && n.id !== "RECLAIM").map((n) => n.id);
    const cols: [string[], number][] = [
      [["SRC"], 96], [screen, 386],
      [d.nodes.filter((n) => n.id === "MAKEUP").map((n) => n.id), 676],
      [d.nodes.filter((n) => n.id === "RECLAIM").map((n) => n.id), 946],
    ];
    cols.forEach(([ids, x]) => ids.forEach((id, i) => { p[id] = { x, y: PAD + (H - 2 * PAD) * (i + 0.5) / ids.length }; }));
    return p;
  }, [d]);

  if (err) return <div><div className="eyebrow">Workspace</div><h1>MFD — Bag Flow Simulation</h1><div className="card">Backend not reachable: {err}</div></div>;
  if (!d) return <div><div className="eyebrow">Workspace</div><h1>MFD — Bag Flow Simulation</h1><div className="card">Loading flow…</div></div>;

  const click = (id: string) => {
    if (id === sel) { setSel(null); setSim(null); return; }
    setSel(id); setSim(null);
    api.mfdSimulate(pid, id).then(setSim).catch(() => {});
  };

  const edge = (from: string, to: string, i: number) => {
    const a = pos[from], b = pos[to]; if (!a || !b) return null;
    const x1 = a.x + NW / 2, y1 = a.y, x2 = b.x - NW / 2, y2 = b.y, mx = (x1 + x2) / 2;
    const hot = sel && (from === sel || impacted.has(from)) && (to === sel || impacted.has(to));
    return <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none"
      stroke={hot ? "#D4374C" : "var(--gray2)"} strokeWidth={hot ? 2.5 : 1.5} markerEnd="url(#arr)" opacity={hot ? 1 : .7} />;
  };

  const node = (id: string, name: string, sub: string, color: string, clickable: boolean) => {
    const pt = pos[id]; if (!pt) return null;
    const isSel = id === sel, isImp = impacted.has(id), isRe = rerouteIds.has(id);
    const stroke = isSel ? "#D4374C" : isRe ? "#2F62C4" : isImp ? "#B0720A" : color;
    return (
      <g key={id} transform={`translate(${pt.x - NW / 2},${pt.y - NH / 2})`} style={{ cursor: clickable ? "pointer" : "default" }} onClick={() => clickable && click(id)}>
        <rect width={NW} height={NH} rx={12} fill="var(--card)" stroke={stroke} strokeWidth={isSel || isImp || isRe ? 2.5 : 1.5}
          strokeDasharray={isSel ? "6 4" : undefined}
          style={{ filter: isSel ? "drop-shadow(0 4px 12px rgba(212,55,76,.35))" : "drop-shadow(0 2px 6px rgba(14,34,51,.10))" }} />
        <circle cx={14} cy={14} r={4} fill={isSel ? "#D4374C" : color} />
        {isRe && <text x={NW - 8} y={17} textAnchor="end" fontSize={9} fontWeight={700} fill="#2F62C4">↳ absorbs</text>}
        <text x={NW / 2} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--ink)">{name.length > 20 ? name.slice(0, 19) + "…" : name}</text>
        <text x={NW / 2} y={42} textAnchor="middle" fontSize={10} fill="var(--gray)" fontFamily="var(--fm)">{sub}</text>
      </g>
    );
  };

  return (
    <div>
      <div className="eyebrow">Workspace · Material Flow Diagram</div>
      <h1>MFD — Bag Flow Simulation</h1>
      <p style={{ color: "var(--gray)", maxWidth: 880, marginBottom: 8 }}>
        Live model of the T5 baggage flow. <b>Click any line to simulate its loss</b> — MAX projects the throughput lost,
        how much parallel lines can absorb (and their new utilisation), the residual backlog at risk, the downstream impact,
        and the mitigation plan with the resources required.
      </p>

      <div className="card">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--gray)" />
            </marker>
          </defs>
          {d.nodes.filter((n) => n.id !== "MAKEUP" && n.id !== "RECLAIM").map((n, i) => edge("SRC", n.id, 1000 + i))}
          {d.edges.map((e, i) => edge(e.from, e.to, i))}
          {node("SRC", "Check-in & Sort", "zones → screening", "#2F62C4", false)}
          {d.nodes.map((n) => node(n.id, n.name, `${n.share_pct}% · ${n.bags.toLocaleString()} bags`, statusColor(n.status), true))}
        </svg>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 11, color: "var(--gray)" }}>
          <span><span style={{ color: "#178A43" }}>●</span> in service</span>
          <span><span style={{ color: "#B0720A" }}>●</span> commissioning</span>
          <span><span style={{ color: "#D4374C" }}>● dashed</span> simulated loss</span>
          <span><span style={{ color: "#2F62C4" }}>●</span> absorbs re-routed flow</span>
          <span style={{ marginLeft: "auto" }}>Tip: click a line to run a loss simulation</span>
        </div>
      </div>

      {sel && !sim && <div className="card" style={{ marginTop: 14 }}>Simulating loss of {d.nodes.find((n) => n.id === sel)?.name}…</div>}

      {sel && sim && (
        <div className="card" style={{ marginTop: 14, borderLeft: `4px solid ${SEV[sim.severity] || "#6B8093"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div className="panel-h" style={{ margin: 0 }}>Loss simulation — {sim.area.name}</div>
            <span style={{ fontSize: 12, fontWeight: 700, color: SEV[sim.severity], textTransform: "uppercase" }}>{sim.severity} · est. recovery {sim.recovery_min} min</span>
          </div>

          <div className="kpis" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 12 }}>
            <div className="kpi"><div className="label">Throughput lost</div><div className="val" style={{ color: "#D4374C", fontSize: 22 }}>{sim.lost_bags.toLocaleString()}</div><div className="label">{sim.lost_pct}% of bags/day</div></div>
            <div className="kpi"><div className="label">Re-routed (absorbed)</div><div className="val" style={{ color: "#2F62C4", fontSize: 22 }}>{sim.absorbed.toLocaleString()}</div><div className="label">via parallel lines</div></div>
            <div className="kpi"><div className="label">Residual backlog</div><div className="val" style={{ color: sim.residual > 0 ? "#D4374C" : "#178A43", fontSize: 22 }}>{sim.residual.toLocaleString()}</div><div className="label">{sim.residual_pct}% at risk of mishandling</div></div>
            <div className="kpi"><div className="label">Downstream affected</div><div className="val" style={{ fontSize: 14, lineHeight: 1.3 }}>{sim.downstream.length ? sim.downstream.map((x) => x.name).join(" → ") : "End of line"}</div></div>
          </div>

          {/* re-routing */}
          <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            <div>
              <div className="panel-h" style={{ fontSize: 13 }}>Re-routing — parallel line absorption</div>
              {sim.reroute.length ? sim.reroute.map((r) => (
                <div key={r.id} style={{ marginBottom: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 3 }}>
                    <span>{r.name} <span style={{ color: "#2F62C4" }}>+{r.take.toLocaleString()} bags</span></span>
                    <span style={{ color: utilColor(r.new_util), fontWeight: 700 }}>{r.was_util}% → {r.new_util}%</span>
                  </div>
                  <div style={{ height: 8, background: "var(--bg)", borderRadius: 4, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(100, r.new_util)}%`, height: "100%", background: utilColor(r.new_util) }} />
                  </div>
                </div>
              )) : <div style={{ fontSize: 13, color: "var(--gray)" }}>No parallel line — flow cannot be automatically re-routed. The full {sim.lost_bags.toLocaleString()} bags require manual handling per the plan below.</div>}
            </div>

            {/* resources */}
            <div>
              <div className="panel-h" style={{ fontSize: 13 }}>Resources required</div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <tbody>
                  {sim.resources.map((r, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--bor)" }}>
                      <td style={{ padding: "5px 0" }}>{r.item}</td>
                      <td style={{ textAlign: "right", color: "var(--gray)" }}>{r.type}</td>
                      <td style={{ textAlign: "right", fontWeight: 700, width: 40 }}>×{r.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* mitigation playbook */}
          <div style={{ marginTop: 16 }}>
            <div className="panel-h" style={{ fontSize: 13 }}>Mitigation strategy</div>
            <ol style={{ margin: "4px 0 0", paddingLeft: 20, fontSize: 13, lineHeight: 1.6 }}>
              {sim.mitigation.map((m, i) => <li key={i}>{m}</li>)}
            </ol>
          </div>

          <button className="btn" style={{ marginTop: 14, background: "transparent", color: "var(--teal)", border: "1px solid var(--bor)" }} onClick={() => { setSel(null); setSim(null); }}>Reset simulation</button>
        </div>
      )}
    </div>
  );
}
