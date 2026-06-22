import { useEffect, useRef, useState } from "react";
import { api, Meeting, MeetingDetail } from "../lib/api";

const statusColor = (s = "") => (/clos/i.test(s) ? "#178A43" : /open/i.test(s) ? "#B0720A" : "#6B8093");
const srcPill: Record<string, string> = { seed: "#0E7C86", manual: "#2F62C4", upload: "#7B36C9" };

export default function Meetings({ pid }: { pid: string }) {
  const [list, setList] = useState<Meeting[]>([]);
  const [sel, setSel] = useState<MeetingDetail | null>(null);
  const [mode, setMode] = useState<"view" | "add">("view");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // add-form state
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [attendees, setAttendees] = useState("");
  const [transcript, setTranscript] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = (selectFirst = false) =>
    api.meetings(pid).then((m) => {
      setList(m);
      if (selectFirst && m.length) open(m[0].id);
    }).catch((e) => setErr(String(e)));

  useEffect(() => { setSel(null); setMode("view"); load(true); }, [pid]);

  const open = (id: string) => { setMode("view"); api.meeting(id).then(setSel).catch(() => {}); };

  const resetForm = () => { setTitle(""); setDate(""); setAttendees(""); setTranscript(""); if (fileRef.current) fileRef.current.value = ""; };

  const submit = async () => {
    setErr(""); setBusy(true);
    try {
      const file = fileRef.current?.files?.[0];
      let m: MeetingDetail;
      if (file) {
        m = await api.uploadMeeting(pid, file, title, date);
      } else {
        if (!transcript.trim()) { setErr("Paste a transcript or choose a file."); setBusy(false); return; }
        m = await api.createMeeting({
          project_id: pid, title: title || "Untitled meeting", meeting_date: date,
          attendees: attendees.split(",").map((s) => s.trim()).filter(Boolean), transcript,
        });
      }
      resetForm();
      await load();
      setSel(m); setMode("view");
    } catch (e) { setErr(String(e)); }
    setBusy(false);
  };

  const del = async (id: string) => {
    if (!confirm("Delete this meeting record?")) return;
    await api.deleteMeeting(id).catch(() => {});
    setSel(null);
    load();
  };

  return (
    <div>
      <div className="eyebrow">Workspace · meeting intelligence</div>
      <h1>🎙 Meetings & Transcripts</h1>
      <p style={{ color: "var(--gray)", maxWidth: 920, marginBottom: 10 }}>
        A searchable record of every project meeting. Paste or upload the transcript and MAX extracts the
        attendees, decisions and action log — and makes it all answerable in <b>Ask MAX</b>, cited by meeting.
      </p>

      <div className="grid" style={{ gridTemplateColumns: "320px 1fr", alignItems: "start" }}>
        {/* list */}
        <div>
          <button className="btn" style={{ width: "100%", marginBottom: 10, background: "var(--teal)", color: "#fff", border: "none" }}
            onClick={() => { setMode("add"); setSel(null); }}>＋ Record a meeting</button>
          {list.map((m) => (
            <div key={m.id} className="card" onClick={() => open(m.id)}
              style={{ cursor: "pointer", marginBottom: 8, padding: "10px 12px", borderLeft: `3px solid ${srcPill[m.source] || "#6B8093"}`, background: sel?.id === m.id ? "var(--tdim)" : undefined }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: "var(--ink)" }}>{m.title}</div>
              <div style={{ fontSize: 11, color: "var(--gray)", fontFamily: "var(--fm)", marginTop: 3 }}>
                {m.meeting_date || "—"} · {m.attendees.length} attendees · {m.actions.length} actions
              </div>
            </div>
          ))}
          {!list.length && <div className="card" style={{ fontSize: 13, color: "var(--gray)" }}>No meetings recorded yet.</div>}
        </div>

        {/* right pane */}
        {mode === "add" ? (
          <div className="card">
            <div className="panel-h">Record a meeting</div>
            {err && <div style={{ color: "#D4374C", fontSize: 12, marginBottom: 8 }}>{err}</div>}
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 10 }}>
                <Field label="Title"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. PILZ Stakeholder Session" style={inp} /></Field>
                <Field label="Date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inp} /></Field>
              </div>
              <Field label="Attendees (comma-separated, optional — auto-detected otherwise)">
                <input value={attendees} onChange={(e) => setAttendees(e.target.value)} placeholder="Andy Groom, Ali Zakaria, …" style={inp} />
              </Field>
              <Field label="Transcript / minutes">
                <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={12}
                  placeholder="Paste the meeting transcript or minutes here…" style={{ ...inp, fontFamily: "var(--fm)", fontSize: 12, resize: "vertical" }} />
              </Field>
              <Field label="…or upload a file (PDF / DOCX / TXT / VTT)">
                <input ref={fileRef} type="file" accept=".pdf,.docx,.doc,.txt,.vtt,.md,.csv" style={{ fontSize: 12 }} />
              </Field>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn" disabled={busy} onClick={submit} style={{ background: "var(--teal)", color: "#fff", border: "none" }}>
                  {busy ? "Extracting…" : "Save & extract minutes"}
                </button>
                <button className="btn" onClick={() => { setMode("view"); if (list.length) open(list[0].id); }} style={{ background: "transparent", border: "1px solid var(--bor)" }}>Cancel</button>
              </div>
              <div style={{ fontSize: 11, color: "var(--gray)" }}>
                MAX auto-extracts a summary, attendees, decisions and the action log. With live AI on, extraction is richer; otherwise a built-in extractor is used.
              </div>
            </div>
          </div>
        ) : sel ? (
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <div className="panel-h" style={{ margin: 0 }}>{sel.title}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span className="pill" style={{ background: (srcPill[sel.source] || "#6B8093") + "22", color: srcPill[sel.source] || "#6B8093", fontSize: 10 }}>{sel.source}</span>
                <button className="btn" onClick={() => del(sel.id)} style={{ background: "transparent", border: "1px solid var(--bor)", color: "#D4374C", fontSize: 12, padding: "4px 10px" }}>Delete</button>
              </div>
            </div>
            <div style={{ fontSize: 12, color: "var(--gray)", fontFamily: "var(--fm)", margin: "2px 0 12px" }}>
              {sel.meeting_date || "—"}{sel.chair && <> · Chair: {sel.chair}</>} · {sel.attendees.length} attendees
            </div>

            {sel.attendees.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                {sel.attendees.map((a) => <span key={a} className="pill" style={{ background: "var(--bg)", color: "var(--ink)", fontSize: 11 }}>{a}</span>)}
              </div>
            )}

            {sel.summary && <p style={{ fontSize: 13.5, lineHeight: 1.55, marginTop: 0 }}>{sel.summary}</p>}

            {sel.decisions.length > 0 && <>
              <div className="panel-h" style={{ fontSize: 13 }}>Decisions & agreements</div>
              <ul style={{ margin: "0 0 14px", paddingLeft: 20, fontSize: 13, lineHeight: 1.6 }}>
                {sel.decisions.map((d, i) => <li key={i}>{d}</li>)}
              </ul>
            </>}

            {sel.actions.length > 0 && <>
              <div className="panel-h" style={{ fontSize: 13 }}>Action log</div>
              <table style={{ fontSize: 12.5, marginBottom: 14 }}>
                <thead><tr><th style={{ width: 36 }}>Ref</th><th>Action</th><th>Owner</th><th>Due</th><th>Status</th></tr></thead>
                <tbody>
                  {sel.actions.map((a, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--gray)", fontFamily: "var(--fm)" }}>{a.ref || "—"}</td>
                      <td>{a.text}</td>
                      <td style={{ whiteSpace: "nowrap" }}>{a.owner || "—"}</td>
                      <td style={{ whiteSpace: "nowrap", color: "var(--gray)" }}>{a.due || "—"}</td>
                      <td>{a.status ? <span className="pill" style={{ background: statusColor(a.status) + "22", color: statusColor(a.status), fontSize: 10 }}>{a.status}</span> : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>}

            {sel.topics.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                {sel.topics.map((t) => <span key={t} className="pill" style={{ background: "var(--tdim)", color: "var(--teal)", fontSize: 10 }}>{t}</span>)}
              </div>
            )}

            <details>
              <summary style={{ cursor: "pointer", fontSize: 12, color: "var(--teal)", fontWeight: 600 }}>View full transcript ({sel.transcript.length.toLocaleString()} chars)</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--fm)", fontSize: 11.5, lineHeight: 1.5, color: "var(--ink)", background: "var(--bg)", padding: 12, borderRadius: 8, marginTop: 8, maxHeight: 360, overflow: "auto" }}>{sel.transcript}</pre>
            </details>

            <div style={{ marginTop: 12, fontSize: 11, color: "var(--gray)", borderTop: "1px solid var(--bor)", paddingTop: 8 }}>
              ◆ This meeting is searchable in <b>Ask MAX</b> — questions about decisions and actions cite it as a source.
            </div>
          </div>
        ) : (
          <div className="card" style={{ color: "var(--gray)" }}>Select a meeting, or record a new one.</div>
        )}
      </div>
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid var(--bor)", background: "var(--card)", color: "var(--ink)", fontSize: 13 };

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <div style={{ fontSize: 11, color: "var(--gray)", marginBottom: 4 }}>{label}</div>
      {children}
    </label>
  );
}
