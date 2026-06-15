import { useEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { api, Project } from "./lib/api";
import CommandCenter from "./views/CommandCenter";
import Terminals from "./views/Terminals";
import Documents from "./views/Documents";
import Forecast from "./views/Forecast";
import RiskEngine from "./views/RiskEngine";
import Chat from "./views/Chat";

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pid, setPid] = useState<string>("t5-baggage-programme");

  useEffect(() => { api.projects().then(setProjects).catch(() => {}); }, []);

  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "" : "dark";
    document.documentElement.setAttribute("data-theme", cur);
  };

  return (
    <div className="app">
      <aside>
        <div className="brand">MAX<b>.ai</b></div>
        <select value={pid} onChange={(e) => setPid(e.target.value)}
          style={{ margin: "0 14px 12px", padding: 7, borderRadius: 6, border: "1px solid var(--bor)", background: "var(--card)", color: "var(--ink)" }}>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.terminal} · {p.name}</option>)}
        </select>
        <nav className="nav">
          <NavLink to="/command">◉ Command Center</NavLink>
          <NavLink to="/terminals">🏬 Terminals</NavLink>
          <NavLink to="/documents">▤ Documents</NavLink>
          <NavLink to="/forecast">📈 Bag Forecast</NavLink>
          <NavLink to="/risk">⚠ Risk Engine</NavLink>
          <NavLink to="/chat">◆ Ask MAX</NavLink>
        </nav>
        <div style={{ marginTop: "auto", padding: "0 14px" }}>
          <button className="btn" style={{ width: "100%", background: "transparent", color: "var(--gray)", border: "1px solid var(--bor)" }} onClick={toggleTheme}>🌙 Theme</button>
        </div>
      </aside>
      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/command" />} />
          <Route path="/command" element={<CommandCenter pid={pid} />} />
          <Route path="/terminals" element={<Terminals onOpen={setPid} />} />
          <Route path="/documents" element={<Documents pid={pid} />} />
          <Route path="/forecast" element={<Forecast pid={pid} />} />
          <Route path="/risk" element={<RiskEngine pid={pid} />} />
          <Route path="/chat" element={<Chat pid={pid} />} />
        </Routes>
      </main>
    </div>
  );
}
