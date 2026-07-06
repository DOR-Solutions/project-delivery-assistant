import { useEffect, useState } from "react";
import { api, PslOut } from "../lib/api";

const CAT_COLOR: Record<string, string> = {
  "Building & Construction": "#B0720A", "Software & Application": "#2F62C4",
  "Mitigations & Business Change": "#7B36C9", "Training": "#178A43",
  "Equipment": "#009E84", "Consultation": "#C9A227", "Signage": "#D4374C", "DIY": "#6B8093",
};

export default function PSL() {
  const [d, setD] = useState<PslOut | null>(null);
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");

  useEffect(() => { const t = setTimeout(() => api.psl(cat, q).then(setD).catch(() => {}), 120); return () => clearTimeout(t); }, [cat, q]);

  if (!d) return <div><div className="eyebrow">Workspace</div><h1>Preferred Supplier List</h1><div className="card">Loading…</div></div>;

  return (
    <div>
      <div className="eyebrow">Workspace · procurement</div>
      <h1>📇 Preferred Supplier List (PSL)</h1>
      <p style={{ color: "var(--gray)", maxWidth: 780, marginBottom: 12 }}>
        Procurement-authorised suppliers, ready to be contacted for help or assistance. Filter by category or search.
      </p>

      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search supplier or service…"
        style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1px solid var(--bor)", background: "var(--card)", color: "var(--ink)", fontSize: 13, marginBottom: 10 }} />

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        <button onClick={() => setCat("")} className="pill" style={{ cursor: "pointer", padding: "6px 11px", border: "1px solid var(--bor)", background: cat === "" ? "var(--tdim)" : "transparent", color: cat === "" ? "var(--teal)" : "var(--gray)" }}>All ({d.total})</button>
        {d.categories.map((c) => (
          <button key={c} onClick={() => setCat(c)} className="pill" style={{ cursor: "pointer", padding: "6px 11px", border: "1px solid var(--bor)", background: cat === c ? CAT_COLOR[c] + "22" : "transparent", color: cat === c ? CAT_COLOR[c] : "var(--gray)" }}>
            {c} ({d.counts[c] || 0})
          </button>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(320px,1fr))" }}>
        {d.suppliers.map((s) => (
          <div className="card" key={s.name + s.framework} style={{ borderTop: `3px solid ${CAT_COLOR[s.category] || "#6B8093"}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div style={{ fontFamily: "var(--fh)", fontWeight: 700, fontSize: 16, color: "var(--ink)" }}>{s.name}</div>
              <span className="pill" style={{ background: "#178A4322", color: "#178A43" }}>✓ Approved</span>
            </div>
            <span className="pill" style={{ background: (CAT_COLOR[s.category] || "#6B8093") + "22", color: CAT_COLOR[s.category] || "#6B8093", marginTop: 6, display: "inline-block" }}>{s.category}</span>
            <div style={{ fontSize: 12, color: "var(--light)", margin: "8px 0" }}>{s.services}</div>
            <div style={{ fontSize: 11, color: "var(--gray)", fontFamily: "var(--fm)", display: "flex", justifyContent: "space-between" }}>
              <span>Framework {s.framework}</span><span>★ {s.rating}</span>
            </div>
            <div style={{ borderTop: "1px solid var(--bor)", marginTop: 10, paddingTop: 10, fontSize: 12 }}>
              <div style={{ color: "var(--ink)", fontWeight: 600 }}>{s.contact}</div>
              <div><a href={`mailto:${s.email}`} style={{ color: "var(--teal)", textDecoration: "none" }}>{s.email}</a></div>
              <div style={{ color: "var(--light)", fontFamily: "var(--fm)" }}>{s.phone}</div>
            </div>
            <a href={`mailto:${s.email}?subject=${encodeURIComponent("MAX.ai — assistance request (" + s.category + ")")}`}
              className="btn" style={{ display: "inline-block", marginTop: 10, textDecoration: "none", fontSize: 12 }}>✉ Contact</a>
          </div>
        ))}
        {!d.suppliers.length && <div className="card">No suppliers match.</div>}
      </div>
    </div>
  );
}
