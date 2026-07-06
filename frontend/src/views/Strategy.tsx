import { useState } from "react";
import { api, StrategyOut } from "../lib/api";

const sev = (b?: string) => ({ critical: "#D4374C", high: "#B0720A", medium: "#C9A227", low: "#178A43" }[b || ""] || "#6B8093");
const band = (l: number, i: number) => { const s = l * i; return s >= 15 ? "critical" : s >= 9 ? "high" : s >= 4 ? "medium" : "low"; };
const cyclePri = (p: string) => ({ critical: "high", high: "medium", medium: "low", low: "critical" }[p] || "medium");

interface Act { area: string; action: string; mitigation: string; responsibility: string; priority: string; }
interface Todo { text: string; detail: string; owner: string; priority: string; done?: boolean; }

export default function Strategy({ pid }: { pid: string }) {
  const [s, setS] = useState<StrategyOut | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [focus, setFocus] = useState("");
  const [acts, setActs] = useState<Act[]>([]);
  const [todo, setTodo] = useState<Todo[]>([]);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);

  const run = () => {
    setBusy(true); setErr(""); setS(null);
    api.strategy(pid, focus).then((d) => {
      setS(d);
      setActs(d.mitigation_actions.map((m) => ({ ...m })));
      setTodo(d.todo.map((t) => ({ text: t.text, detail: t.detail || "", owner: t.owner, priority: t.priority || t.pri || "medium" })));
    }).catch((e) => setErr(String(e))).finally(() => setBusy(false));
  };

  const updA = (i: number, p: Partial<Act>) => setActs(acts.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const updT = (i: number, p: Partial<Todo>) => setTodo(todo.map((x, j) => (j === i ? { ...x, ...p } : x)));

  const copy = () => {
    if (!s) return;
    const L: string[] = [`MITIGATION PLAN — ${pid}`, "", "OBJECTIVE:", s.objective, ""];
    if (s.narrative) L.push("SUMMARY:", s.narrative, "");
    L.push("MITIGATION ACTIONS (Area | Action | Mitigation | Responsibility):");
    acts.forEach((a) => L.push(`  ${a.area} | ${a.action} | ${a.mitigation} | ${a.responsibility} [${a.priority}]`));
    L.push("", "FMEA (Process | Failure Mode | Effect | Severity | Controls):");
    s.fmea.forEach((f) => L.push(`  ${f.process} | ${f.failure_mode} | ${f.effect} | S${f.severity} | ${f.controls}`));
    L.push("", "PREDICTED RISKS:");
    s.predicted_risks.forEach((r) => L.push(`  [${(r.band || band(r.likelihood, r.impact)).toUpperCase()}] ${r.title} — ${r.rationale}`));
    L.push("", "PM TO-DO:");
    todo.forEach((t) => L.push(`  [${t.priority.toUpperCase()}]${t.done ? " (done)" : ""} ${t.text}${t.detail ? " — " + t.detail : ""} (${t.owner})`));
    L.push("", "COMMAND & CONTROL:", s.command_control, "", "CONTINGENCY:", s.contingency);
    navigator.clipboard.writeText(L.join("\n")).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  const exportPptx = () => {
    if (!s) return;
    setExporting(true);
    const plan = {
      project: pid,
      objective: s.objective, narrative: s.narrative,
      mitigation_actions: acts, fmea: s.fmea,
      access_windows: s.access_windows, approvals: s.approvals,
      command_control: s.command_control, contingency: s.contingency,
      predicted_risks: s.predicted_risks,
      todo: todo.map((t) => ({ text: t.text, owner: t.owner, priority: t.priority })),
    };
    api.exportPptx(plan).then((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `MAX_${pid}_Mitigation_Plan.pptx`;
      document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }).catch((e) => setErr(String(e))).finally(() => setExporting(false));
  };

  const ipt = (val: string, on: (v: string) => void, ph: string, style: any = {}) => (
    <input value={val} onChange={(e) => on(e.target.value)} placeholder={ph}
      style={{ width: "100%", border: "none", background: "transparent", color: "var(--ink)", fontSize: 12, outline: "none", ...style }} />
  );

  return (
    <div>
      <div className="eyebrow">Workspace · intelligence</div>
      <h1>🧭 Mitigation Plan</h1>
      <p style={{ color: "var(--gray)", maxWidth: 780, marginBottom: 12 }}>
        MAX drafts a Heathrow-style mitigation plan — objective, Area/Action/Mitigation/Responsibility table,
        FMEA, command-and-control and contingency — from the project's ingested documents (Pilz plans, lessons
        learned, bag-volume data), the live risk register and throughput signals. Steer it below, then edit any row.
      </p>

      <div style={{ display: "flex", gap: 8 }}>
        <input value={focus} onChange={(e) => setFocus(e.target.value)} onKeyDown={(e) => e.key === "Enter" && run()}
          placeholder="Help with the plan… e.g. 'areas 264 & 265 access windows', 'staffing & cost', 'night commissioning'"
          style={{ flex: 1, padding: "11px 14px", borderRadius: 8, border: "1px solid var(--bor)", background: "var(--card)", color: "var(--ink)", fontSize: 13 }} />
        <button className="btn" onClick={run} disabled={busy}>{busy ? "Analysing…" : s ? "Refine" : "Generate"}</button>
        {s && <button className="btn" style={{ background: "transparent", color: "var(--teal)", border: "1px solid var(--bor)" }} onClick={copy}>{copied ? "✓ Copied" : "Copy"}</button>}
        {s && <button className="btn" onClick={exportPptx} disabled={exporting}>{exporting ? "Exporting…" : "⬇ Export .pptx"}</button>}
      </div>

      {err && <div className="card" style={{ marginTop: 14, color: "#D4374C" }}>Could not generate: {err}</div>}

      {s && (
        <>
          <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "14px 0 4px", flexWrap: "wrap" }}>
            <span className="pill" style={{ background: s.ai ? "#178A4322" : "#2F62C422", color: s.ai ? "#178A43" : "#2F62C4" }}>
              {s.ai ? "◆ Generated live by Claude" : "⚙ Engine-generated (add AI credit for full narrative draft)"}
            </span>
            <span style={{ fontSize: 11, color: "var(--gray)", fontFamily: "var(--fm)" }}>
              grounded in {s.inputs.documents} doc(s) · {s.inputs.risks} risks · {s.inputs.bag_days} days bag data{focus ? ` · focus: “${focus}”` : ""}
            </span>
          </div>

          <div className="card" style={{ marginTop: 10, borderLeft: "3px solid var(--teal)" }}>
            <div className="panel-h">Objective</div>
            <div style={{ fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>{s.objective}</div>
            {s.narrative && <div style={{ fontSize: 12, color: "var(--light)", marginTop: 8, lineHeight: 1.5 }}>{s.narrative}</div>}
          </div>

          <div className="sec" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Mitigation actions ({acts.length}) — editable</span>
            <button onClick={() => setActs([...acts, { area: "", action: "", mitigation: "", responsibility: "PM", priority: "medium" }])}
              style={{ border: "1px solid var(--bor)", background: "transparent", color: "var(--teal)", borderRadius: 6, cursor: "pointer", fontSize: 11, padding: "3px 8px" }}>+ Add action</button>
          </div>
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table>
              <thead><tr><th>Area</th><th>Action</th><th>Mitigation</th><th>Responsibility</th><th>Pri</th><th></th></tr></thead>
              <tbody>
                {acts.map((a, i) => (
                  <tr key={i}>
                    <td style={{ minWidth: 90 }}>{ipt(a.area, (v) => updA(i, { area: v }), "area")}</td>
                    <td style={{ minWidth: 150 }}>{ipt(a.action, (v) => updA(i, { action: v }), "action", { fontWeight: 600 })}</td>
                    <td style={{ minWidth: 260 }}>{ipt(a.mitigation, (v) => updA(i, { mitigation: v }), "mitigation")}</td>
                    <td style={{ minWidth: 110 }}>{ipt(a.responsibility, (v) => updA(i, { responsibility: v }), "owner", { fontFamily: "var(--fm)", fontSize: 11 })}</td>
                    <td><span className="pill" title="click to change" style={{ background: sev(a.priority) + "22", color: sev(a.priority), cursor: "pointer" }} onClick={() => updA(i, { priority: cyclePri(a.priority) })}>{a.priority}</span></td>
                    <td><button onClick={() => setActs(acts.filter((_, j) => j !== i))} style={{ border: "none", background: "transparent", color: "var(--gray)", cursor: "pointer", fontSize: 15 }}>×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="sec">Failure Modes & Effects Analysis (FMEA)</div>
          <div className="card" style={{ padding: 0, overflowX: "auto" }}>
            <table>
              <thead><tr><th>Process</th><th>Failure mode</th><th>Effect</th><th>Severity</th><th>Controls</th></tr></thead>
              <tbody>
                {s.fmea.map((f, i) => (
                  <tr key={i}>
                    <td style={{ fontFamily: "var(--fm)" }}>{f.process}</td>
                    <td style={{ fontWeight: 600 }}>{f.failure_mode}</td>
                    <td>{f.effect}</td>
                    <td><span className="pill" style={{ background: (f.severity >= 8 ? "#D4374C" : f.severity >= 5 ? "#B0720A" : "#178A43") + "22", color: f.severity >= 8 ? "#D4374C" : f.severity >= 5 ? "#B0720A" : "#178A43" }}>{f.severity}</span></td>
                    <td>{f.controls}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {s.access_windows.length > 0 && (
            <>
              <div className="sec">Access windows &amp; schedule impact</div>
              <div className="card" style={{ padding: 0, overflowX: "auto" }}>
                <table>
                  <thead><tr><th>Item</th><th>Line/Area</th><th>Access</th><th>Start</th><th>Finish</th><th>Original</th><th>New</th></tr></thead>
                  <tbody>
                    {s.access_windows.map((a, i) => (
                      <tr key={i}>
                        <td style={{ fontFamily: "var(--fm)" }}>{a.item}</td>
                        <td style={{ fontWeight: 600 }}>{a.area}</td>
                        <td>{a.access}</td>
                        <td style={{ fontFamily: "var(--fm)" }}>{a.start}</td>
                        <td style={{ fontFamily: "var(--fm)" }}>{a.finish}</td>
                        <td style={{ color: "var(--gray)" }}>{a.original_duration}</td>
                        <td style={{ color: "var(--green)", fontWeight: 700 }}>{a.new_duration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

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
                <button onClick={() => setTodo([...todo, { text: "", detail: "", owner: "PM", priority: "medium" }])}
                  style={{ border: "1px solid var(--bor)", background: "transparent", color: "var(--teal)", borderRadius: 6, cursor: "pointer", fontSize: 11, padding: "3px 8px" }}>+ Add task</button>
              </div>
              {todo.map((t, i) => (
                <div className="row-card" key={i} style={{ borderLeftColor: sev(t.priority), display: "flex", gap: 8, alignItems: "flex-start" }}>
                  <input type="checkbox" checked={!!t.done} onChange={(e) => updT(i, { done: e.target.checked })} style={{ marginTop: 4 }} />
                  <span className="pill" title="click to change" style={{ background: sev(t.priority) + "22", color: sev(t.priority), cursor: "pointer" }} onClick={() => updT(i, { priority: cyclePri(t.priority) })}>{t.priority}</span>
                  <div style={{ flex: 1 }}>
                    {ipt(t.text, (v) => updT(i, { text: v }), "task…", { fontWeight: 600, textDecoration: t.done ? "line-through" : "none" })}
                    {ipt(t.owner, (v) => updT(i, { owner: v }), "owner", { fontFamily: "var(--fm)", fontSize: 10, color: "var(--gray)", marginTop: 2 })}
                  </div>
                  <button onClick={() => setTodo(todo.filter((_, j) => j !== i))} style={{ border: "none", background: "transparent", color: "var(--gray)", cursor: "pointer", fontSize: 15 }}>×</button>
                </div>
              ))}
            </div>
          </div>

          <div className="two-col" style={{ marginTop: 18 }}>
            <div className="card"><div className="panel-h">Command &amp; control</div><div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>{s.command_control}</div></div>
            <div className="card"><div className="panel-h">Contingency</div><div style={{ fontSize: 12, color: "var(--ink)", lineHeight: 1.5 }}>{s.contingency}</div></div>
          </div>

          {s.approvals.length > 0 && (
            <>
              <div className="sec">Stakeholder approvals</div>
              <div className="card" style={{ padding: 0, overflowX: "auto" }}>
                <table>
                  <thead><tr><th>Name</th><th>Company</th><th>Role</th><th>Signature</th><th>Date</th></tr></thead>
                  <tbody>
                    {s.approvals.map((a, i) => (
                      <tr key={i}><td>{a.name || "—"}</td><td style={{ fontWeight: 600 }}>{a.company}</td><td>{a.role}</td><td style={{ color: "var(--gray2)" }}>____________</td><td style={{ color: "var(--gray2)" }}>________</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
