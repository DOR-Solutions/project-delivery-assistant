import { useEffect, useMemo, useState } from "react";
import { api, MfdMap, MfdSim, MfdSystemInfo } from "../lib/api";

const NW = 154, NH = 56, COLW = 250, X0 = 100;
const SEV: Record<string, string> = { critical: "#D4374C", high: "#B0720A", medium: "#C9A227", low: "#178A43" };
const statusColor = (s: string) => (s === "commissioning" ? "#B0720A" : s === "out-of-service" ? "#D4374C" : "#178A43");
const utilColor = (u: number) => (u >= 100 ? "#D4374C" : u >= 90 ? "#B0720A" : "#178A43");

export default function SystemMap({ pid }: { pid: string }) {
  const [systems, setSystems] = useState<MfdSystemInfo[]>([]);
  const [sysId, setSysId] = useState("t5");
  const [map, setMap] = useState<MfdMap | null>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<string[]>([]);
  const [sim, setSim] = useState<MfdSim | null>(null);

  useEffect(() => { api.mfdSystems().then((r) => setSystems(r.systems)).catch((e) => setErr(String(e))); }, []);
  useEffect(() => { setMap(null); setSel([]); setSim(null); api.mfdMap(sysId).then(setMap).catch((e) => setErr(String(e))); }, [sysId]);
  useEffect(() => {
    if (!sel.length) { setSim(null); return; }
    api.mfdSimulate(sysId, sel).then(setSim).catch(() => {});
  }, [sel, sysId]);

  const rerouteIds = useMemo(() => new Set((sim?.reroute || []).map((r) => r.id)), [sim]);
  const downIds = useMemo(() => new Set((sim?.downstream || []).map((r) => r.id)), [sim]);
  const selSet = useMemo(() => new Set(sel), [sel]);

  const layout = useMemo(() => {
    if (!map) return { pos: {} as Record<string, { x: number; y: number }>, W: 800, H: 360, cols: [] as { x: number; label: string }[] };
    const stages = [...new Set(map.nodes.map((n) => n.stage))].sort((a, b) => a - b);
    const colIdx = new Map(stages.map((s, i) => [s, i]));
    const byStage: Record<number, string[]> = {};
    map.nodes.forEach((n) => { (byStage[n.stage] ||= []).push(n.id); });
    const maxN = Math.max(...Object.values(byStage).map((a) => a.length));
    const H = Math.max(340, 78 + maxN * 84 + 24);
    const pos: Record<string, { x: number; y: number }> = {};
    const x = (s: number) => X0 + (colIdx.get(s) || 0) * COLW;
    stages.forEach((s) => {
      const ids = byStage[s];
      ids.forEach((id, i) => { pos[id] = { x: x(s), y: 78 + (H - 100) * (i + 0.5) / ids.length }; });
    });
    const W = X0 + (stages.length - 1) * COLW + 110;
    const cols = stages.map((s) => ({ x: x(s), label: map.stages.find((st) => st.stage === s)?.label || `Stage ${s}` }));
    return { pos, W, H, cols };
  }, [map]);

  if (err) return <Shell><div className="card">Backend not reachable: {err}</div></Shell>;
  if (!map) return <Shell><div className="card">Loading flow…</div></Shell>;

  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const { pos, W, H, cols } = layout;

  const edge = (from: string, to: string, i: number) => {
    const a = pos[from], b = pos[to]; if (!a || !b) return null;
    const x1 = a.x + NW / 2, y1 = a.y, x2 = b.x - NW / 2, y2 = b.y, mx = (x1 + x2) / 2;
    const involved = (id: string) => selSet.has(id) || downIds.has(id);
    const hot = sel.length && involved(from) && involved(to);
    return <path key={i} d={`M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}`} fill="none"
      stroke={hot ? "#D4374C" : "var(--gray2)"} strokeWidth={hot ? 2.5 : 1.5} markerEnd="url(#arr)" opacity={hot ? 1 : .65} />;
  };

  const node = (id: string, name: string, sub: string, color: string) => {
    const pt = pos[id]; if (!pt) return null;
    const isSel = selSet.has(id), isRe = rerouteIds.has(id), isDown = downIds.has(id);
    const stroke = isSel ? "#D4374C" : isRe ? "#2F62C4" : isDown ? "#B0720A" : color;
    return (
      <g key={id} transform={`translate(${pt.x - NW / 2},${pt.y - NH / 2})`} style={{ cursor: "pointer" }} onClick={() => toggle(id)}>
        <rect width={NW} height={NH} rx={12} fill={isSel ? "#FBE9EC" : "var(--card)"} stroke={stroke} strokeWidth={isSel || isRe || isDown ? 2.5 : 1.5}
          strokeDasharray={isSel ? "6 4" : undefined}
          style={{ filter: isSel ? "drop-shadow(0 4px 12px rgba(212,55,76,.35))" : "drop-shadow(0 2px 6px rgba(14,34,51,.10))" }} />
        <circle cx={13} cy={13} r={4} fill={isSel ? "#D4374C" : color} />
        {isRe && <text x={NW - 8} y={16} textAnchor="end" fontSize={9} fontWeight={700} fill="#2F62C4">↳ absorbs</text>}
        {isDown && <text x={NW - 8} y={16} textAnchor="end" fontSize={9} fontWeight={700} fill="#B0720A">impacted</text>}
        <text x={NW / 2} y={23} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="var(--ink)">{name.length > 21 ? name.slice(0, 20) + "…" : name}</text>
        <text x={NW / 2} y={41} textAnchor="middle" fontSize={9.5} fill="var(--gray)" fontFamily="var(--fm)">{sub}</text>
      </g>
    );
  };

  return (
    <Shell>
      {/* system selector */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        {systems.map((s) => (
          <button key={s.id} onClick={() => setSysId(s.id)}
            className="btn"
            style={{
              background: s.id === sysId ? "var(--teal)" : "transparent",
              color: s.id === sysId ? "#fff" : "var(--ink)",
              border: `1px solid ${s.id === sysId ? "var(--teal)" : "var(--bor)"}`,
            }}>
            {s.terminal} · {s.name} <span style={{ opacity: .7, fontSize: 11 }}>({s.lines})</span>
          </button>
        ))}
      </div>

      <div className="card">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--gray)" />
            </marker>
          </defs>
          {cols.map((c, i) => <text key={i} x={c.x} y={32} textAnchor="middle" fontSize={11} fontWeight={700} fill="var(--gray)" style={{ textTransform: "uppercase", letterSpacing: .5 }}>{c.label}</text>)}
          {map.edges.map((e, i) => edge(e.from, e.to, i))}
          {map.nodes.map((nd) => node(nd.id, nd.name, `${nd.share_pct}% · ${nd.bags.toLocaleString()} bags`, statusColor(nd.status)))}
        </svg>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 11, color: "var(--gray)" }}>
          <span><span style={{ color: "#178A43" }}>●</span> in service</span>
          <span><span style={{ color: "#B0720A" }}>●</span> commissioning / impacted</span>
          <span><span style={{ color: "#D4374C" }}>● dashed</span> simulated loss</span>
          <span><span style={{ color: "#2F62C4" }}>●</span> absorbs re-routed flow</span>
          <span style={{ marginLeft: "auto" }}>Click one or more lines to build a failure scenario</span>
        </div>
      </div>

      {/* scenario bar */}
      {sel.length > 0 && (
        <div className="card" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <b style={{ fontSize: 13 }}>Scenario — lines lost:</b>
          {sel.map((id) => {
            const nm = map.nodes.find((n) => n.id === id)?.name || id;
            return <span key={id} style={{ background: "#FBE9EC", color: "#D4374C", border: "1px solid #f3c2cb", borderRadius: 14, padding: "3px 10px", fontSize: 12, fontWeight: 600, cursor: "pointer" }} onClick={() => toggle(id)}>{nm} ✕</span>;
          })}
          <button className="btn" style={{ marginLeft: "auto", background: "transparent", color: "var(--teal)", border: "1px solid var(--bor)" }} onClick={() => setSel([])}>Clear</button>
        </div>
      )}

      {sel.length > 0 && !sim && <div className="card" style={{ marginTop: 12 }}>Simulating…</div>}

      {sim && (
        <div className="card" style={{ marginTop: 12, borderLeft: `4px solid ${SEV[sim.severity] || "#6B8093"}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
            <div className="panel-h" style={{ margin: 0 }}>
              Loss simulation — {sim.areas.map((a) => a.name).join(" + ")}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: SEV[sim.severity], textTransform: "uppercase" }}>{sim.severity} · est. recovery {sim.recovery_min} min</span>
          </div>

          <div className="kpis" style={{ gridTemplateColumns: "repeat(4,1fr)", marginTop: 12 }}>
            <div className="kpi"><div className="label">Throughput lost</div><div className="val" style={{ color: "#D4374C", fontSize: 22 }}>{sim.lost_bags.toLocaleString()}</div><div className="label">{sim.lost_pct}% of bags/day</div></div>
            <div className="kpi"><div className="label">Re-routed (absorbed)</div><div className="val" style={{ color: "#2F62C4", fontSize: 22 }}>{sim.absorbed.toLocaleString()}</div><div className="label">via parallel lines</div></div>
            <div className="kpi"><div className="label">Residual backlog</div><div className="val" style={{ color: sim.residual > 0 ? "#D4374C" : "#178A43", fontSize: 22 }}>{sim.residual.toLocaleString()}</div><div className="label">{sim.residual_pct}% at risk of mishandling</div></div>
            <div className="kpi"><div className="label">Downstream affected</div><div className="val" style={{ fontSize: 13, lineHeight: 1.3 }}>{sim.downstream.length ? sim.downstream.map((x) => x.name).join(" → ") : "End of line"}</div></div>
          </div>

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
              )) : <div style={{ fontSize: 13, color: "var(--gray)" }}>No spare parallel capacity — {sim.residual.toLocaleString()} bags require manual handling per the plan below.</div>}
            </div>

            <div>
              <div className="panel-h" style={{ fontSize: 13 }}>Resources required (combined)</div>
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

          <div style={{ marginTop: 16 }}>
            <div className="panel-h" style={{ fontSize: 13 }}>Mitigation strategy</div>
            {sim.per_line.map((p) => (
              <div key={p.id} style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700 }}>
                  {p.name} <span style={{ color: "var(--gray)", fontWeight: 400 }}>— {p.residual.toLocaleString()} bags residual{p.absorbed ? `, ${p.absorbed.toLocaleString()} re-routed` : ""}</span>
                </div>
                <ol style={{ margin: "2px 0 0", paddingLeft: 20, fontSize: 13, lineHeight: 1.55 }}>
                  {p.mitigation.map((m, i) => <li key={i}>{m}</li>)}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="eyebrow">Workspace · Material Flow Diagram</div>
      <h1>MFD — Bag Flow Simulation</h1>
      <p style={{ color: "var(--gray)", maxWidth: 900, marginBottom: 8 }}>
        Live model of the baggage flow across T5, T3 InterBag and PT5 TBS. <b>Click one or more lines to build a failure scenario</b> —
        MAX projects throughput lost, how much parallel lines can absorb (and their new utilisation), residual backlog at risk,
        downstream impact, and the mitigation plan with combined resources required.
      </p>
      {children}
    </div>
  );
}
