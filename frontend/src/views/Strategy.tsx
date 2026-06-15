import { useState } from "react";
import { api, StrategyOut } from "../lib/api";

const sev = (b?: string) => ({ critical: "#D4374C", high: "#B0720A", medium: "#C9A227", low: "#178A43" }[b || ""] || "#6B8093");
const band = (l: number, i: number) => { const s = l * i; return s >= 15 ? "critical" : s >= 9 ? "high" : s >= 4 ? "medium" : "low"; };

interface Item { text: string; detail: string; owner: string; priority: string; done?: boolean; }

export default function Strategy({ pid }: { pid: string }) {
  const [s, setS] = useState<StrategyOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [focus, setFocus] = useState("");
  const [mit, setMit] = useState<Item[]>([]);
  const [todo, setTodo] = useState<Item[]>([]);
  const [copied, setCopied] = useState(false);

  const run = () => {
    setBusy(true); setErr(""); setS(null);
    api.strategy(pid, focus).then((d) => {
      setS(d);
      setMit(d.mitigation.map((m) => ({ text: m.title, detail: m.detail, owner: m.owner, priority: m.priority })));
      setTodo(d.todo.map((t) => ({ text: t.text, detail: t.detail || "", owner: t.owner, priority: t.priority || t.pri || "medium" })));
    }).catch((e) => setErr(String(e))).finally(() => setBusy(false));
  };

  const upd = (set: any, list: Item[], i: number, patch: Partial<Item>) => set(list.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const del = (set: any, list: Item[], i: number) => set(list.filter((_, j) => j !== i));
  const add = (set: any, list: Item[]) => set([...list, { text: "", detail: "", owner: "PM", priority: "medium" }]);
  const cyclePri = (p: string) => ({ critical: "high", high: "medium", medium: "low", low: "critical" }[p] || "medium");

  const copy = () => {
    if (!s) return;
    const L: string[] = [`MITIGATION STRATEGY — ${pid}`, ""];
    if (s.narrative) { L.push(s.narrative, ""); }
    L.push("MITIGATION:");
    mit.forEach((m) => L.push(`  [${m.priority.toUpperCase()}] ${m.text} — ${m.detail} (owner: ${m.owner})`));
    L.push("", "PREDICTED RISKS:");
    s.predicted_risks.forEach((r) => L.push(`  [${(r.band || band(r.likelihood, r.impact)).toUpperCase()} ${r.score ?? r.likelihood * r.impact}] ${r.title} — ${r.rationale}`));
    L.push("", "PM TO-DO:");
    todo.forEach((t) => L.push(`  [${t.priority.toUpperCase()}]${t.done ? " (done)" : ""} ${t.text}${t.detail ? " — " + t.detail : ""} (owner: ${t.owner})`));
    navigator.clipboard.writeText(L.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const editRow = (list: Item[], set: any, i: number, it: Item, isTodo: boolean) => (
    <div className="row-card" key={i} style={{ borderLeftColor: sev(it.priority), display: "flex", gap: 8, alignItems: "flex-start" }}>
      {isTodo && <input type="checkbox" checked={!!it.done} onChange={(e) => upd(set, list, i, { done: e.target.checked })} style={{ marginTop: 4 }} />}
      <span className="pill" title="click to change priority" style={{ background: sev(it.priority) + "22", color: sev(it.priority), cursor: "pointer" }}
        onClick={() => upd(set, list, i, { priority: cyclePri(it.priority) })}>{it.priority}</span>
      <div style={{ flex: 1 }}>
        <input value={it.text} onChange={(e) => upd(set, list, i, { text: e.target.value })} placeholder="Describe the action…"
          style={{ width: "100%", border: "none", background: "transparent", color: "var(--ink)", fontWeight: 600, fontSize: 13, textDecoration: it.done ? "line-through" : "none", outline: "none" }} />
          {it.detail !== undefined && <input value={it.detail} onChange={(e) => upd(set, list, i, { detail: e.target.value })} placeholder="detail (optional)"
            style={{ width: "100%", border: "none", background: "transparent", color: "var(--light)", fontSize: 11, outline: "none", marginTop: 2 }} />}
        <input value={it.owner} onChange={(e) => upd(set, list, i, { owner: e.target.value })} placeholder="owner"
          style={{ border: "none", background: "transparent", color: "var(--gray)", fontFamily: "var(--fm)", fontSize: 10, outline: "none", marginTop: 2 }} />
      </div>
      <button onClick={() => del(set, list, i)} title="Remove" style={{ border: "none", background: "transparent", color: "var(--gray)", cursor: "pointer", fontSize: 16 }}>×</button>
    </div>
  );

  return (
    <div>
      <div className="eyebrow">Workspace · intelligence</div>
      <h1>🧭 Mitigation Strategy</h1>
      <p style={{ color: "var(--gray)", maxWidth: 760, marginBottom: 12 }}>
        MAX reads ingested documents (lessons learned, bag-volume data, ready-bag schematics), the live risk
        register and throughput signals to draft a strategy, predict risks and build a PM to-do — then you can
        steer and edit it below.
      </p>

      {/* search / instruction bar */}
      <div style={{ display: "flex", gap: 8 }}>
        <input value={focus} onChange={(e) => setFocus(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Help with strategy… e.g. 'focus on HBS3 commissioning', 'night-works plan', 'staffing & cost'"
          style={{ flex: 1, padding: "11px 14px", borderRadius: 8, border: "1px solid var(--bor)", background: "var(--card)", color: "var(--ink)", fontSize: 13 }} />
        <button className="btn" onClick={run} disabled={busy}>{busy ? "Analysing…" : s ? "Refine" : "Generate"}</button>
        {s && <button className="btn" style={{ background: "transparent", color: "var(--teal)", border: "1px solid var(--bor)" }} onClick={copy}>{copied ? "✓ Copied" : "Copy"}</button>}
      </div>

      {err && <div className="card" style={{ marginTop: 14, color: "#D4374C" }}>Could not generate: {err}</div>}

      {s && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "14px 0 4px", flexWrap: "wrap" }}>
            <span className="pill" style={{ background: s.ai ? "#178A4322" : "#2F62C422", color: s.ai ? "#178A43" : "#2F62C4" }}>
              {s.ai ? "◆ Generated live by Claude" : "⚙ Engine-generated (add AI credit for richer narrative)"}
            </span>
            <span style={{ fontSize: 11, color: "var(--gray)", fontFamily: "var(--fm)" }}>
              grounded in {s.inputs.documents} doc(s) · {s.inputs.risks} risks · {s.inputs.bag_days} days bag data{focus ? ` · focus: “${focus}”` : ""}
            </span>
          </div>

          {s.narrative && (
            <div className="card" style={{ marginTop: 10, borderLeft: "3px solid var(--teal)" }}>
              <div className="panel-h">Executive strategy</div>
              <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{s.narrative}</div>
            </div>
          )}

          <div className="sec" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Mitigation strategy ({mit.length}) — editable</span>
            <button onClick={() => add(setMit, mit)} style={{ border: "1px solid var(--bor)", background: "transparent", color: "var(--teal)", borderRadius: 6, cursor: "pointer", fontSize: 11, padding: "3px 8px" }}>+ Add action</button>
          </div>
          {mit.map((m, i) => editRow(mit, setMit, i, m, false))}

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
              <div className="sec" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>PM to-do — editable</span>
                <button onClick={() => add(setTodo, todo)} style={{ border: "1px solid var(--bor)", background: "transparent", color: "var(--teal)", borderRadius: 6, cursor: "pointer", fontSize: 11, padding: "3px 8px" }}>+ Add task</button>
              </div>
              {todo.map((t, i) => editRow(todo, setTodo, i, t, true))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
