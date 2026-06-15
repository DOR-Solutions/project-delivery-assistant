import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function Chat({ pid }: { pid: string }) {
  const [msgs, setMsgs] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");
  const [ai, setAi] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.aiStatus().then((s) => setAi(s.available)).catch(() => {}); }, []);

  const send = async () => {
    const text = input.trim(); if (!text || busy) return;
    const history = [...msgs, { role: "user", text }];
    setMsgs(history); setInput(""); setBusy(true);
    try { const r = await api.chat(pid, text, history); setMsgs([...history, { role: "ai", text: r.reply }]); }
    catch (e) { setMsgs([...history, { role: "ai", text: "Error: " + e }]); }
    setBusy(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)" }}>
      <h1>Ask MAX {ai ? "" : <span style={{ fontSize: 12, color: "var(--gray)" }}>(set MAXAI_ANTHROPIC_KEY for live AI)</span>}</h1>
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
        {msgs.map((m, i) => (
          <div key={i} className="card" style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start", maxWidth: "80%", background: m.role === "user" ? "var(--teal)" : "var(--card)", color: m.role === "user" ? "#fff" : "var(--ink)" }}>{m.text}</div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about risks, milestones, forecast…" style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid var(--bor)", background: "var(--card)", color: "var(--ink)" }} />
        <button className="btn" onClick={send}>Send</button>
      </div>
    </div>
  );
}
