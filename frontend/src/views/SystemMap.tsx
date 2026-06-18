import { useEffect, useMemo, useState } from "react";
import { api, SystemMapOut, ImpactOut } from "../lib/api";

const W = 1040, H = 470, NW = 156, NH = 58, PAD = 46;
const SEV = { critical: "#D4374C", high: "#B0720A", medium: "#C9A227", low: "#178A43" } as const;
const statusColor = (s: string) => (s === "commissioning" ? "#B0720A" : s === "out-of-service" ? "#D4374C" : "#178A43");

export default function SystemMap({ pid }: { pid: string }) {
  const [d, setD] = useState<SystemMapOut | null>(null);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [impact, setImpact] = useState<ImpactOut | null>(null);

  useEffect(() => { setD(null); setErr(""); setSel(null); setImpact(null); api.systemMap(pid).then(setD).catch((e) => setErr(String(e))); }, [pid]);

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

  if (err) return <div><div className="eyebrow">Workspace</div><h1>System Map</h1><div className="card">Backend not reachable: {err}</div></div>;
  if (!d) return <div><div className="eyebrow">Workspace</div><h1>System Map</h1><div className="card">Loading flow…</div></div>;

  const click = (id: string) => {
    if (id === sel) { setSel(null); setImpact(null); return; }
    setSel(id); setImpact(null);
    api.impact(pid, id).then(setImpact).catch(() => {});
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
    const isSel = id === sel, isImp = impacted.has(id);
    const stroke = isSel ? "#D4374C" : isImp ? "#B0720A" : color;
    return (
      <g key={id} transform={`translate(${pt.x - NW / 2},${pt.y - NH / 2})`} style={{ cursor: clickable ? "pointer" : "default" }} onClick={() => clickable && click(id)}>
        <rect width={NW} height={NH} rx={12} fill="var(--card)" stroke={stroke} strokeWidth={isSel || isImp ? 2.5 : 1.5}
          style={{ filter: isSel ? "drop-shadow(0 4px 12px rgba(212,55,76,.35))" : "drop-shadow(0 2px 6px rgba(14,34,51,.10))" }} />
        <circle cx={14} cy={14} r={4} fill={isSel ? "#D4374C" : color} />
        <text x={NW / 2} y={24} textAnchor="middle" fontSize={12} fontWeight={700} fill="var(--ink)">{name.length > 20 ? name.slice(0, 19) + "…" : name}</text>
        <text x={NW / 2} y={42} textAnchor="middle" fontSize={10} fill="var(--gray)" fontFamily="var(--fm)">{sub}</text>
      </g>
    );
  };

  return (
    <div>
      <div className="eyebrow">Workspace · baggage flow (MFD)</div>
      <h1>🗺 System Map — T5 baggage flow</h1>
      <p style={{ color: "var(--gray)", maxWidth: 820, marginBottom: 8 }}>
        A live model of the T5 material flow. Each area shows its share of throughput and status.
        <b> Click an area to model it going out of service</b> — MAX highlights the downstream impact and bags affected.
      </p>

      <div className="card">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto" }}>
          <defs>
            <marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="var(--gray)" />
            </marker>
          </defs>
          {/* source -> screening edges */}
          {d.nodes.filter((n) => n.id !== "MAKEUP" && n.id !== "RECLAIM").map((n, i) => edge("SRC", n.id, 1000 + i))}
          {d.edges.map((e, i) => edge(e.from, e.to, i))}
          {node("SRC", "Check-in & Sort", "zones → screening", "#2F62C4", false)}
          {d.nodes.map((n) => node(n.id, n.name, `${n.share_pct}% · ${n.bags.toLocaleString()} bags`, statusColor(n.status), true))}
        </svg>
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 8, fontSize: 11, color: "var(--gray)" }}>
          <span><span style={{ color: "#178A43" }}>●</span> in service</span>
          <span><span style={{ color: "#B0720A" }}>●</span> commissioning</span>
          <span><span style={{ color: "#D4374C" }}>●</span> selected / out of service</span>
          <span style={{ marginLeft: "auto" }}>Tip: click an area to model an outage</span>
        </div>
      </div>

      {sel && impact && (
        <div className="card" style={{ marginTop: 14, borderLeft: `4px solid ${(SEV as any)[impact.severity] || "#6B8093"}` }}>
          <div className="panel-h">Impact assessment — {impact.area.name} out of service</div>
          <div className="kpis" style={{ gridTemplateColumns: "repeat(3,1fr)", marginTop: 0 }}>
            <div className="kpi"><div className="label">Throughput share lost</div><div className="val" style={{ color: "#D4374C", fontSize: 24 }}>{impact.share_pct}%</div></div>
            <div className="kpi"><div className="label">Bags affected / day</div><div className="val" style={{ fontSize: 24 }}>{impact.bags_affected.toLocaleString()}</div></div>
            <div className="kpi"><div className="label">Severity</div><div className="val" style={{ color: (SEV as any)[impact.severity], fontSize: 24, textTransform: "capitalize" }}>{impact.severity}</div></div>
          </div>
          <div style={{ marginTop: 12, fontSize: 13, color: "var(--ink)" }}>
            <b>Downstream affected:</b> {impact.downstream.length ? impact.downstream.join(" → ") : "none (end of line)"}.
            {" "}Mitigation: divert flow to parallel screening and pre-clear make-up laterals; porter bags from MIP if dieback observed.
          </div>
          <button className="btn" style={{ marginTop: 12, background: "transparent", color: "var(--teal)", border: "1px solid var(--bor)" }} onClick={() => { setSel(null); setImpact(null); }}>Reset</button>
        </div>
      )}
    </div>
  );
}
