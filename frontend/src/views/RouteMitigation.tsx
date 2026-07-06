import { useEffect, useMemo, useState } from "react";
import { api, MfdImpactRow } from "../lib/api";

const bandColors: Record<string, string> = {
  critical: "#C00000",
  high: "#E8A33D",
  medium: "#7F9F3F",
  low: "#70AD47",
};

export default function RouteMitigation({ pid }: { pid: string }) {
  const [rows, setRows] = useState<MfdImpactRow[]>([]);
  const [nodeId, setNodeId] = useState("HBS_1_2");
  const [dayType, setDayType] = useState("A");
  const [availability, setAvailability] = useState(0);
  const [whatIf, setWhatIf] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadImpact = () => {
    setLoading(true);
    api.mfdImpact(pid, dayType).then((data) => {
      setRows(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { loadImpact(); }, [pid, dayType]);
  useEffect(() => {
    const id = window.setInterval(loadImpact, 20000);
    return () => window.clearInterval(id);
  }, [pid, dayType]);

  useEffect(() => {
    api.mfdWhatIf({ node_id: nodeId, day_type: dayType, availability: availability / 100 }).then(setWhatIf).catch(() => setWhatIf(null));
  }, [nodeId, dayType, availability]);

  const critical = useMemo(() => rows.some((r) => r.band === "critical"), [rows]);

  return (
    <div>
      <div className="eyebrow">Route & Mitigation</div>
      <h1><span className="title-star">★</span> HBS Outage & Route / Mitigation</h1>
      {critical && <div style={{ background: "#C00000", color: "white", padding: 12, borderRadius: 8, marginBottom: 12, fontWeight: 700 }}>Critical outage exposure detected — immediate mitigation required.</div>}

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="panel-h">What-if analysis</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <label>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Node</div>
            <select value={nodeId} onChange={(e) => setNodeId(e.target.value)}>
              <option value="HBS_1_2">HBS 1/2</option>
              <option value="HBS_3">HBS 3</option>
              <option value="HBS_1_3">HBS 1/3</option>
              <option value="OOG_HBS">OOG HBS</option>
              <option value="CI_A">Zone A check-in</option>
              <option value="CI_B">Zone B check-in</option>
              <option value="CI_C">Zone C check-in</option>
              <option value="TX_A">TXA 1/2</option>
              <option value="TX_B">TXB 1–4</option>
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Day type</div>
            <select value={dayType} onChange={(e) => setDayType(e.target.value)}>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </label>
          <label>
            <div style={{ fontSize: 12, marginBottom: 4 }}>Availability {availability}%</div>
            <input type="range" min={0} max={100} value={availability} onChange={(e) => setAvailability(Number(e.target.value))} />
          </label>
        </div>
        {whatIf && <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
          <div><b>Residual:</b> {whatIf.residual_unhandled.toLocaleString()} bags ({whatIf.residual_pct}%)</div>
          <div><b>Mitigation detail:</b> {whatIf.mitigation_detail.join(" · ")}</div>
          <div><b>Playbook:</b> <ol>{whatIf.playbook.map((step: string) => <li key={step}>{step}</li>)}</ol></div>
        </div>}
      </div>

      <div className="card" style={{ marginBottom: 12 }}>
        <div className="panel-h">Flow map</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
          {[
            { id: "CI_A", label: "CI A" },
            { id: "CI_B", label: "CI B" },
            { id: "CI_C", label: "CI C" },
            { id: "HBS_1_2", label: "HBS 1/2" },
            { id: "HBS_3", label: "HBS 3" },
            { id: "HBS_1_3", label: "HBS 1/3" },
            { id: "MAKEUP", label: "Make-up" },
            { id: "OOG_HBS", label: "OOG" },
          ].map((box) => {
            const row = rows.find((r) => r.node_id === box.id);
            return <button key={box.id} onClick={() => setNodeId(box.id)} style={{ border: `2px solid ${row ? bandColors[row.band] || "#6B8093" : "#6B8093"}`, borderRadius: 8, padding: 10, background: "var(--card)", color: "var(--ink)", textAlign: "left" }}>
              <div style={{ fontWeight: 700 }}>{box.label}</div>
              <div style={{ fontSize: 12, color: "var(--gray)" }}>{row ? `${row.band.toUpperCase()} · ${row.residual_unhandled.toLocaleString()}` : "—"}</div>
            </button>;
          })}
        </div>
      </div>

      <div className="card">
        <div className="panel-h">Node table</div>
        {loading ? <div>Loading…</div> : <div style={{ display: "grid", gap: 8 }}>
          {rows.map((row) => (
            <div key={row.node_id} style={{ display: "grid", gridTemplateColumns: "1.4fr 0.8fr 0.8fr 0.7fr", gap: 8, padding: 8, border: "1px solid var(--bor)", borderRadius: 8, alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 700 }}>{row.node}</div>
                <div style={{ fontSize: 12, color: "var(--gray)" }}>{row.type}</div>
              </div>
              <div>{row.bags_at_risk.toLocaleString()} at risk</div>
              <div>{row.residual_unhandled.toLocaleString()} residual</div>
              <div style={{ color: bandColors[row.band] || "#6B8093", fontWeight: 700 }}>{row.band.toUpperCase()}</div>
            </div>
          ))}
        </div>}
      </div>
    </div>
  );
}
