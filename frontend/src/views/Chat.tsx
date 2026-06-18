import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

interface Msg { role: string; text: string; sources?: string[]; ai?: boolean; }

export default function Chat({ pid }: { pid: string }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [live, setLive] = useState(false);
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { api.aiStatus().then((s: any) => setLive(s.available)).catch(() => {}); }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const suggestions = [
    "How many operatives and team leads are on shift today?",
    "Which activities are critical or slipping in the look-ahead?",
    "Will the project finish in budget?",
    "What was the status of B1 transfers?",
  ];

  const send = async (q?: string) => {
    const text = (q ?? input).trim(); if (!text || busy) return;
    const history = [...msgs, { role: "user", text }];
    setMsgs(history); setInput(""); setBusy(true);
    try {
      const r: any = await api.chat(pid, text, history);
      setMsgs([...history, { role: "ai", text: r.reply, sources: r.sources, ai: r.ai }]);
    } catch (e) {
      setMsgs([...history, { role: "ai", text: "Error: " + e }]);
    }
    setBusy(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)" }}>
      <div className="eyebrow">Workspace · assistant</div>
      <h1>◆ Ask MAX
        <span className="pill" style={{ marginLeft: 10, background: live ? "#178A4322" : "#2F62C422", color: live ? "#178A43" : "#2F62C4", fontSize: 10 }}>
          {live ? "live AI + document grounding" : "answering from documents & data"}
        </span>
      </h1>
      <p style={{ color: "var(--gray)", fontSize: 12, marginBottom: 8 }}>
        MAX reads this project's ingested documents (reports, look-aheads, plans) and live data to answer — and cites its sources.
      </p>

      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
        {!msgs.length && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
            {suggestions.map((s) => (
              <button key={s} onClick={() => send(s)} className="pill"
                style={{ cursor: "pointer", padding: "8px 12px", border: "1px solid var(--bor)", background: "var(--card)", color: "var(--ink)", textAlign: "left" }}>
                {s}
              </button>
            ))}
          </div>
        )}
        {msgs.map((m, i) => (
          <div key={i} className="card" style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "82%", background: m.role === "user" ? "var(--teal)" : "var(--card)", color: m.role === "user" ? "#fff" : "var(--ink)", whiteSpace: "pre-wrap" }}>
            {m.text}
            {m.role === "ai" && m.sources && m.sources.length > 0 && (
              <div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--bor)", display: "flex", flexWrap: "wrap", gap: 5 }}>
                {m.sources.map((s) => (
                  <span key={s} className="pill" style={{ background: "var(--card2)", color: "var(--gray)" }}>📄 {s}</span>
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && <div className="card" style={{ alignSelf: "flex-start", color: "var(--gray)" }}>MAX is reading the documents…</div>}
        <div ref={endRef} />
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about staffing, risks, schedule, budget, the day's report…" style={{ flex: 1, padding: 11, borderRadius: 8, border: "1px solid var(--bor)", background: "var(--card)", color: "var(--ink)" }} />
        <button className="btn" onClick={() => send()} disabled={busy}>Send</button>
      </div>
    </div>
  );
}
