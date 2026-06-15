import { useState } from "react";
import { api, StrategyOut } from "../lib/api";

const sev = (b?: string) => ({ critical: "#D4374C", high: "#B0720A", medium: "#C9A227", low: "#178A43" }[b || ""] || "#6B8093");
const band = (likelihood: number, impact: number) => {
  const s = likelihood * impact;
  return s >= 15 ? "critical" : s >= 9 ? "high" : s >= 4 ? "medium" : "low";
};

export default function Strategy({ pid }: { pid: string }) {
  const [s, setS] = useState<StrategyOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const run = () => {
    setBusy(true); setErr(""); setS(null);
    api.strategy(pid).then(setS).catch((e) => setErr(String(e))).finally(() => setBusy(false));
  };

  return (
    <div>
      <div className="eyebrow">Workspace · intelligence</div>
      <h1>🧭 Mitigation Strategy</h1>
      <p style={{ color: "var(--gray)", maxWidth: 760, marginBottom: 12 }}>
        MAX reads the project's ingested documents (lessons learned, bag-volume data, ready-bag schematics),
        the live risk register and throughput signals, then drafts a <b>mitigation strategy</b>,
        <b> predicts emerging risks</b> and writes a <b>prioritised to-do list</b> for the project manager.
      </p>

      <button className="btn" onClick={run} disabled={busy}>
        {busy ? "Analysing…" : s ? "Re-generate strategy" : "Generate strategy"}
      </button>

      {err && <div className="card" style={{ marginTop: 14, color: "#D4374C" }}>Could not generate: {err}</div>}

      {s && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "14px 0 4px", flexWrap: "wrap" }}>
            <span className="pill" style={{ background: s.ai ? "#178A4322" : "#2F62C422", color: s.ai ? "#178A43" : "#2F62C4" }}>
              {s.ai ? "◆ Generated live by Claude" : "⚙ Engine-generated (no AI credit — add credit for richer narrative)"}
            </span>
            <span style={{ fontSize: 11, color: "var(--gray)", fontFamily: "var(--fm)" }}>
              grounded in {s.inputs.documents} doc(s) · {s.inputs.risks} risks · {s.inputs.bag_days} days bag data · {s.inputs.forecast_days} forecast days
            </span>
          </div>

          {s.narrative && (
            <div className="card" style={{ marginTop: 10, borderLeft: "3px solid var(--teal)" }}>
              <div className="panel-h">Executive strategy</div>
              <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{s.narrative}</div>
            </div>
          )}

          <div className="sec">Mitigation strategy ({s.mitigation.length})</div>
          <div className="grid" style={{ gridTemplateColumns: "1fr" }}>
            {s.mitigation.map((m, i) => (
              <div className="row-card" key={i} style={{ borderLeftColor: sev(m.priority) }}>
                <span className="pill" style={{ background: sev(m.priority) + "22", color: sev(m.priority) }}>{m.priority}</span>
                <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: 5 }}>{m.title}</div>
                <div style={{ fontSize: 12, color: "var(--light)", marginTop: 2 }}>{m.detail}</div>
                <div style={{ fontSize: 10, color: "var(--gray)", fontFamily: "var(--fm)", marginTop: 4 }}>Owner: {m.owner}</div>
              </div>
            ))}
          </div>

          <div className="two-col" style={{ marginTop: 18 }}>
            <div>
              <div className="sec">Predicted risks ({s.predicted_risks.length})</div>
              {s.predicted_risks.map((r, i) => {
                const b = r.band || band(r.likelihood, r.impact);
                const score = r.score ?? r.likelihood * r.impact;
                return (
                  <div className="row-card" key={i} style={{ borderLeftColor: sev(b) }}>
                    <span className="pill" style={{ background: sev(b) + "22", color: sev(b) }}>{b} · {score}</span>
                    {r.source && <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--gray)", marginLeft: 8 }}>{r.source}</span>}
                    <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: 5 }}>{r.title}</div>
                    <div style={{ fontSize: 12, color: "var(--light)", marginTop: 2 }}>{r.rationale}</div>
                  </div>
                );
              })}
            </div>
            <div>
              <div className="sec">Project-manager to-do</div>
              {s.todo.map((t, i) => {
                const p = t.priority || t.pri || "medium";
                return (
                  <div className="row-card" key={t.id || i} style={{ borderLeftColor: sev(p) }}>
                    <span className="pill" style={{ background: sev(p) + "22", color: sev(p) }}>{p}</span>
                    {t.tag && <span style={{ fontFamily: "var(--fm)", fontSize: 10, color: "var(--gray)", marginLeft: 8 }}>{t.tag}</span>}
                    <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: 5 }}>{t.text}</div>
                    {t.detail && <div style={{ fontSize: 11, color: "var(--light)", marginTop: 2 }}>{t.detail}</div>}
                    <div style={{ fontSize: 10, color: "var(--gray)", fontFamily: "var(--fm)", marginTop: 4 }}>Owner: {t.owner}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
