import { useEffect, useState } from "react";
import { api, ForesightOut } from "../lib/api";

export default function Foresight({ onOpen }: { onOpen: (pid: string) => void }) {
  const [f, setF] = useState<ForesightOut | null>(null);
  useEffect(() => { api.foresight().then(setF).catch(() => {}); }, []);
  if (!f) return <div><div className="eyebrow">Workspace</div><h1>Foresight</h1><div className="card">Loading…</div></div>;

  return (
    <div>
      <div className="eyebrow">Workspace · look-ahead</div>
      <h1>✦ Foresight</h1>
      <p style={{ color: "var(--gray)", marginBottom: 8, maxWidth: 720 }}>
        MAX scans the whole portfolio for predicted pressure points and cross-project synergies —
        turning live and historic signals into a forward plan.
      </p>

      <div className="two-col" style={{ marginTop: 8 }}>
        <div>
          <div className="sec">Predicted pressure points</div>
          {f.predictions.length ? f.predictions.map((p, i) => (
            <div className="row-card" key={i} style={{ borderLeftColor: p.score >= 15 ? "#D4374C" : "#B0720A" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span className="pill" style={{ background: "var(--tdim)", color: "var(--teal)" }}>{p.terminal} · {p.project}</span>
                <span className="pill" style={{ background: "#D4374C22", color: "#D4374C" }}>{p.score}</span>
              </div>
              <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: 6 }}>{p.title}</div>
              <div style={{ fontSize: 12, color: "var(--light)", marginTop: 3 }}>{p.forecast}</div>
              <div style={{ fontSize: 10, color: "var(--gray)", fontFamily: "var(--fm)", marginTop: 4 }}>Owner: {p.owner}</div>
            </div>
          )) : <div className="card">No pressure points forecast — portfolio nominal.</div>}
        </div>

        <div>
          <div className="sec">Cross-project synergies</div>
          {f.synergies.length ? f.synergies.map((s, i) => (
            <div className="row-card" key={i} style={{ borderLeftColor: "#7B36C9" }}>
              <span className="pill" style={{ background: "#7B36C922", color: "#7B36C9" }}>{s.area}</span>
              <div style={{ color: "var(--ink)", fontWeight: 600, marginTop: 6 }}>{s.projects.join(" · ")}</div>
              <div style={{ fontSize: 12, color: "var(--light)", marginTop: 3 }}>{s.opportunity}</div>
            </div>
          )) : <div className="card">No synergies detected.</div>}
        </div>
      </div>
    </div>
  );
}
