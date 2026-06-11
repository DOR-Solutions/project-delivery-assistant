import React, { useEffect, useRef, useState } from 'react';
import { api } from '../api';

export default function AiChat({ projectId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [enabled, setEnabled] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    api.aiStatus().then((s) => setEnabled(s.enabled)).catch(() => setEnabled(false));
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setSending(true);

    try {
      const result = await api.aiChat({ message: text, projectId, history });
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: result.reply, fallback: result.fallback },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `⚠️ ${err.message}`, error: true },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="ai-chat">
      <div className="ai-header">
        <h2>🤖 Assistant</h2>
        {enabled === false && <span className="badge offline" title="Set ANTHROPIC_API_KEY to enable">offline</span>}
        {enabled === true && <span className="badge online">Claude</span>}
      </div>
      <p className="muted small">
        {projectId
          ? 'Grounded in the selected project. Ask about risks, next steps, or planning.'
          : 'Ask anything about delivery. Select a project for grounded answers.'}
      </p>

      <div className="messages" ref={scrollRef}>
        {messages.length === 0 && (
          <p className="muted small">Try: “What should we focus on next?”</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role} ${m.error ? 'error' : ''}`}>
            {m.content}
          </div>
        ))}
        {sending && <div className="message assistant muted">Thinking…</div>}
      </div>

      <form className="ai-input" onSubmit={send}>
        <input
          type="text"
          placeholder="Ask the assistant…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={sending}
        />
        <button type="submit" disabled={sending || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
