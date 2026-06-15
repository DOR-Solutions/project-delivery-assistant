import { useEffect, useState } from "react";
import { api, Project } from "../lib/api";

const TERMS = ["T1", "T2", "T3", "T4", "T5"];
export default function Terminals({ onOpen }: { onOpen: (pid: string) => void }) {
  const [byT, setByT] = useState<Record<string, Project[]>>({});
  const [sel, setSel] = useState("T5");
  useEffect(() => { api.byTerminal().then(setByT).catch(() => {}); }, []);
  const projs = byT[sel] || [];
  return (
    <div>
      <h1>Terminals</h1>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {TERMS.map((t) => (
          <button key={t} onClick={() => setSel(t)}
            style={{ flex: 1, padding: "12px", borderRadius: 10, cursor: "pointer", fontFamily: "var(--fh)", fontWeight: 800, fontSize: 16,
              border: sel === t ? "1px solid var(--teal)" : "1px solid var(--bor)", background: sel === t ? "var(--tdim)" : "var(--card)", color: sel === t ? "var(--teal)" : "var(--gray)" }}>
            {t}<div style={{ fontSize: 9 }}>{(byT[t] || []).length} PROJECT(S)</div>
          </button>
        ))}
      </div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))" }}>
        {projs.map((p) => (
          <div className="card" key={p.id} style={{ cursor: "pointer" }} onClick={() => onOpen(p.id)}>
            <span className="pill" style={{ background: "var(--tdim)", color: "var(--teal)" }}>{p.terminal}</span>
            <div style={{ fontFamily: "var(--fh)", fontWeight: 700, fontSize: 15, color: "var(--ink)", marginTop: 8 }}>{p.name}</div>
          </div>
        ))}
        {!projs.length && <div className="card">No projects in {sel}.</div>}
      </div>
    </div>
  );
}
