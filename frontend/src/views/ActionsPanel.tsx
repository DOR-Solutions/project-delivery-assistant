import { useEffect, useState } from "react";
import { api, ActionRegister, NextAgenda, ProgressUpdate, TaskItem } from "../lib/api";

const STATUS = ["open", "in-progress", "closed"];
const statusColor = (s: string) => (s === "closed" ? "#178A43" : s === "in-progress" ? "#2F62C4" : "#B0720A");
const ownerColor: Record<string, string> = { supplier: "#7B36C9", pm: "#0E7C86", unassigned: "#6B8093" };
const ownerLabel: Record<string, string> = { supplier: "Supplier", pm: "Heathrow / PM", unassigned: "Unassigned" };

export default function ActionsPanel({ pid }: { pid: string }) {
  const [reg, setReg] = useState<ActionRegister | null>(null);
  const [agenda, setAgenda] = useState<NextAgenda | null>(null);
  const [update, setUpdate] = useState<ProgressUpdate | null>(null);
  const [fWs, setFWs] = useState("");
  const [fOwner, setFOwner] = useState("");

  const load = () => api.actionRegister(pid).then(setReg).catch(() => {});
  useEffect(() => { setAgenda(null); setUpdate(null); load(); }, [pid]);

  const setStatus = (t: TaskItem, status: string) =>
    api.updateTask(t.id, { status }).then(() => { load(); setAgenda(null); setUpdate(null); });

  if (!reg) return <div className="card">Loading action register…</div>;

  const tasks = reg.tasks.filter((t) => (!fWs || t.workstream === fWs) && (!fOwner || t.owner_type === fOwner));
  const kpis: [string, string | number, string][] = [
    ["Progress", reg.progress_pct + "%", reg.progress_pct >= 66 ? "#178A43" : reg.progress_pct >= 33 ? "#B0720A" : "#D4374C"],
    ["Open", reg.open, "#B0720A"],
    ["Closed", reg.closed, "#178A43"],
    ["Overdue", reg.overdue, reg.overdue ? "#D4374C" : "#178A43"],
    ["Total actions", reg.total, "#10283B"],
  ];

  return (
    <div>
      <div className="kpis" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        {kpis.map(([l, v, c]) => (
          <div className="kpi" key={l}><div className="label">{l}</div><div className="val" style={{ color: c, fontSize: 22 }}>{v}</div></div>
        ))}
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 12 }}>
        <div className="card">
          <div className="panel-h">By assignment</div>
          {reg.by_owner_type.map((g) => (
            <div className="ws-row" key={g.name}>
              <div className="top"><span><span style={{ color: ownerColor[g.name] || "#6B8093" }}>●</span> {ownerLabel[g.name] || g.name}</span><b>{g.closed}/{g.total} done</b></div>
              <div className="ws-bar"><div className="ws-fill" style={{ width: (g.total ? g.closed / g.total * 100 : 0) + "%", background: ownerColor[g.name] || "#6B8093" }} /></div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="panel-h">By workstream</div>
          {reg.by_workstream.map((g) => (
            <div className="ws-row" key={g.name}>
              <div className="top"><span>{g.name}</span><b>{g.closed}/{g.total}</b></div>
              <div className="ws-bar"><div className="ws-fill" style={{ width: (g.total ? g.closed / g.total * 100 : 0) + "%", background: "#0E7C86" }} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* generators */}
      <div style={{ display: "flex", gap: 8, margin: "14px 0 4px", flexWrap: "wrap" }}>
        <button className="btn" style={{ background: "var(--teal)", color: "#fff", border: "none" }}
          onClick={() => { setUpdate(null); api.nextAgenda(pid).then(setAgenda); }}>🗓 Generate next agenda</button>
        <button className="btn" style={{ background: "transparent", border: "1px solid var(--bor)", color: "var(--ink)" }}
          onClick={() => { setAgenda(null); api.progressUpdate(pid).then(setUpdate); }}>📣 Generate progress update</button>
      </div>

      {agenda && <Generated title={agenda.title} onClose={() => setAgenda(null)} text={agendaText(agenda)}>
        <div style={{ fontSize: 12, color: "var(--gray)", marginBottom: 8 }}>Carries forward {agenda.carry_forward.length} open actions · based on {agenda.based_on || "—"} · register {agenda.progress_pct}% complete</div>
        <b style={{ fontSize: 12.5 }}>Standing items</b>
        <ol style={{ margin: "4px 0 12px", paddingLeft: 20, fontSize: 13 }}>{agenda.standing.map((s, i) => <li key={i}>{s}</li>)}</ol>
        <b style={{ fontSize: 12.5 }}>Outstanding actions to review</b>
        {agenda.carry_forward_by_workstream.map((w) => (
          <div key={w.workstream} style={{ marginTop: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "#0E7C86" }}>{w.workstream}</div>
            <ul style={{ margin: "2px 0", paddingLeft: 20, fontSize: 12.5 }}>
              {w.items.map((t) => <li key={t.id}>{t.ref ? t.ref + " " : ""}{t.text} — <i>{t.owner}</i>{t.due ? `, due ${t.due}` : ""}{t.overdue ? " ⚠ overdue" : ""}</li>)}
            </ul>
          </div>
        ))}
        {agenda.for_noting_closed.length > 0 && <>
          <b style={{ fontSize: 12.5 }}>For noting — completed since last session</b>
          <ul style={{ margin: "2px 0", paddingLeft: 20, fontSize: 12.5, color: "var(--gray)" }}>
            {agenda.for_noting_closed.map((t) => <li key={t.id}>✓ {t.text}</li>)}
          </ul>
        </>}
      </Generated>}

      {update && <Generated title="Progress update" onClose={() => setUpdate(null)} text={update.text}>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--fm)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>{update.text}</pre>
      </Generated>}

      {/* register table */}
      <div className="card" style={{ marginTop: 12 }}>
        <div className="panel-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <span>Action register</span>
          <span style={{ display: "flex", gap: 6 }}>
            <select value={fOwner} onChange={(e) => setFOwner(e.target.value)} style={sel}>
              <option value="">All owners</option><option value="pm">Heathrow / PM</option><option value="supplier">Supplier</option><option value="unassigned">Unassigned</option>
            </select>
            <select value={fWs} onChange={(e) => setFWs(e.target.value)} style={sel}>
              <option value="">All workstreams</option>
              {reg.by_workstream.map((g) => <option key={g.name} value={g.name}>{g.name}</option>)}
            </select>
          </span>
        </div>
        <table style={{ fontSize: 12.5 }}>
          <thead><tr><th style={{ width: 32 }}>Ref</th><th>Action</th><th>Workstream</th><th>Owner</th><th>Due</th><th style={{ width: 124 }}>Status</th></tr></thead>
          <tbody>
            {tasks.map((t) => (
              <tr key={t.id}>
                <td style={{ color: "var(--gray)", fontFamily: "var(--fm)" }}>{t.ref || "—"}</td>
                <td>{t.text}</td>
                <td><span className="pill" style={{ background: "var(--tdim)", color: "var(--teal)", fontSize: 10 }}>{t.workstream}</span></td>
                <td style={{ whiteSpace: "nowrap" }}>{t.owner}<br /><span className="pill" style={{ background: (ownerColor[t.owner_type] || "#6B8093") + "22", color: ownerColor[t.owner_type] || "#6B8093", fontSize: 9 }}>{ownerLabel[t.owner_type] || t.owner_type}</span></td>
                <td style={{ whiteSpace: "nowrap", color: t.overdue ? "#D4374C" : "var(--gray)", fontWeight: t.overdue ? 700 : 400 }}>{t.due || "—"}{t.overdue ? " ⚠" : ""}</td>
                <td>
                  <select value={t.status} onChange={(e) => setStatus(t, e.target.value)}
                    style={{ ...sel, color: statusColor(t.status), fontWeight: 700, borderColor: statusColor(t.status) }}>
                    {STATUS.map((s) => <option key={s} value={s} style={{ color: "var(--ink)" }}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
            {!tasks.length && <tr><td colSpan={6} style={{ color: "var(--gray)", padding: 16 }}>No actions match the filter.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const sel: React.CSSProperties = { padding: "5px 8px", borderRadius: 7, border: "1px solid var(--bor)", background: "var(--card)", color: "var(--ink)", fontSize: 12 };

function agendaText(a: NextAgenda): string {
  const lines = [a.title, "", "Standing items:"];
  a.standing.forEach((s, i) => lines.push(`  ${i + 1}. ${s}`));
  lines.push("", "Outstanding actions to review:");
  a.carry_forward_by_workstream.forEach((w) => {
    lines.push(`  ${w.workstream}:`);
    w.items.forEach((t) => lines.push(`    - ${t.ref ? t.ref + " " : ""}${t.text} (${t.owner}${t.due ? `, due ${t.due}` : ""})${t.overdue ? " [OVERDUE]" : ""}`));
  });
  if (a.for_noting_closed.length) {
    lines.push("", "For noting — completed since last session:");
    a.for_noting_closed.forEach((t) => lines.push(`    ✓ ${t.text}`));
  }
  return lines.join("\n");
}

function Generated({ title, text, children, onClose }: { title: string; text: string; children: React.ReactNode; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); };
  return (
    <div className="card" style={{ marginTop: 8, borderLeft: "4px solid var(--teal)" }}>
      <div className="panel-h" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>{title}</span>
        <span style={{ display: "flex", gap: 6 }}>
          <button className="btn" onClick={copy} style={{ fontSize: 11, padding: "4px 10px", background: "transparent", border: "1px solid var(--bor)" }}>{copied ? "Copied ✓" : "Copy"}</button>
          <button className="btn" onClick={onClose} style={{ fontSize: 11, padding: "4px 10px", background: "transparent", border: "1px solid var(--bor)" }}>✕</button>
        </span>
      </div>
      {children}
    </div>
  );
}
