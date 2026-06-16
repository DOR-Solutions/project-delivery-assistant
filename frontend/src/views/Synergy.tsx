import { useEffect, useState } from "react";
import { api, SynergyOut } from "../lib/api";

const mon = (d: string) => new Date(d).toLocaleDateString("en-GB", { month: "short", year: "2-digit" });

export default function Synergy({ onOpen }: { onOpen: (pid: string) => void }) {
  const [s, setS] = useState<SynergyOut | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => { api.synergy().then(setS).catch((e) => setErr(String(e))); }, []);

  if (err) return <div><div className="eyebrow">Workspace</div><h1>Synergy</h1><div className="card">Backend not reachable: {err}</div></div>;
  if (!s) return <div><div className="eyebrow">Workspace</div><h1>Synergy</h1><div className="card">Scanning the portfolio…</div></div>;
  const cur = s.currency || "£";
  const fmt = (n = 0) => cur + n.toLocaleString();

  return (
    <div>
      <div className="eyebrow">Workspace · cross-project savings</div>
      <h1>♻ Synergy</h1>
      <p style={{ color: "var(--gray)", maxWidth: 780, marginBottom: 12 }}>
        MAX scans every project's suppliers and delivery schedule to find cross-overs — where the same supplier
        works across projects and where schedules overlap — and recommends the saving from combining them
        (single mobilisation, shared crew, merged commissioning/SAT windows).
      </p>

      <div className="card" style={{ borderLeft: "4px solid #178A43", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
          <span className="kpi-big" style={{ fontFamily: "var(--fh)", fontWeight: 800, fontSize: 30, color: "#178A43" }}>{fmt(s.total_saving)}</span>
          <span style={{ color: "var(--ink)", fontSize: 14 }}>total recommended saving across {s.opportunities.length} shared-supplier opportunit{s.opportunities.length === 1 ? "y" : "ies"}</span>
        </div>
      </div>

      {s.opportunities.map((o, i) => (
        <div className="card" key={i} style={{ marginTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ fontFamily: "var(--fh)", fontWeight: 700, fontSize: 17, color: "var(--ink)" }}>{o.supplier}</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "var(--fh)", fontWeight: 800, fontSize: 22, color: "#178A43" }}>{fmt(o.saving)}</div>
              <div style={{ fontSize: 10, color: "var(--gray)", fontFamily: "var(--fm)" }}>potential saving</div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "10px 0" }}>
            {o.projects.map((p) => (
              <button key={p.id} onClick={() => onOpen(p.id)} title={`${mon(p.start)} – ${mon(p.finish)} · ${fmt(p.budget)}`}
                style={{ cursor: "pointer", border: "1px solid var(--bor)", background: "var(--card2)", borderRadius: 8, padding: "6px 10px", textAlign: "left" }}>
                <div style={{ fontWeight: 700, color: "var(--teal)", fontSize: 12 }}>{p.terminal}</div>
                <div style={{ fontSize: 11, color: "var(--ink)" }}>{p.name.length > 22 ? p.name.slice(0, 22) + "…" : p.name}</div>
                <div style={{ fontSize: 10, color: "var(--gray)", fontFamily: "var(--fm)" }}>{mon(p.start)}–{mon(p.finish)} · {fmt(p.budget)}</div>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
            <span className="pill" style={{ background: o.overlap ? "#B0720A22" : "#6B809322", color: o.overlap ? "#B0720A" : "#6B8093" }}>
              {o.overlap ? "⏱ schedule overlap" : "sequential"}
            </span>
            <span style={{ fontSize: 11, color: "var(--gray)" }}>{o.overlap_summary}</span>
          </div>

          <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5, marginBottom: 8 }}>{o.recommendation}</div>

          <div style={{ display: "flex", gap: 18, fontSize: 11, color: "var(--gray)", fontFamily: "var(--fm)", borderTop: "1px solid var(--bor)", paddingTop: 8 }}>
            <span>Combined spend: <b style={{ color: "var(--ink)" }}>{fmt(o.combined_budget)}</b></span>
            <span>Shared overhead: <b style={{ color: "#178A43" }}>{fmt(o.shared_overhead)}</b></span>
            <span>Merged schedule: <b style={{ color: "#178A43" }}>{fmt(o.merged_schedule)}</b></span>
          </div>
        </div>
      ))}

      {!s.opportunities.length && <div className="card">No cross-project supplier overlaps found.</div>}
    </div>
  );
}
