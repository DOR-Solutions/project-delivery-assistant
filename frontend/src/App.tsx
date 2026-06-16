import { useEffect, useState } from "react";
import { Routes, Route, NavLink, Navigate } from "react-router-dom";
import { api, PortfolioProject } from "./lib/api";
import CommandCenter from "./views/CommandCenter";
import Terminals from "./views/Terminals";
import Portfolio from "./views/Portfolio";
import Ingest from "./views/Ingest";
import Dashboard from "./views/Dashboard";
import Documents from "./views/Documents";
import Foresight from "./views/Foresight";
import LookAhead from "./views/LookAhead";
import Synergy from "./views/Synergy";
import PSL from "./views/PSL";
import Strategy from "./views/Strategy";
import Budget from "./views/Budget";
import Forecast from "./views/Forecast";
import RiskEngine from "./views/RiskEngine";
import Chat from "./views/Chat";

const ragDot = (rag: string) => ({ green: "#178A43", amber: "#B0720A", red: "#D4374C" }[rag] || "#6B8093");

export default function App() {
  const [projects, setProjects] = useState<PortfolioProject[]>([]);
  const [pid, setPid] = useState<string>("t5-baggage-programme");
  const [q, setQ] = useState("");

  const load = () => api.portfolio().then((p) => setProjects(p.projects)).catch(() => {});
  useEffect(() => { load(); }, []);

  const toggleTheme = () => {
    const cur = document.documentElement.getAttribute("data-theme") === "dark" ? "" : "dark";
    document.documentElement.setAttribute("data-theme", cur);
  };

  const visible = projects.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  const wsLink = (to: string, icon: string, label: string, badge?: number) => (
    <NavLink to={to} className="ws">
      <span className="ws-ic">{icon}</span><span>{label}</span>
      {badge != null && <span className="ws-badge">{badge}</span>}
    </NavLink>
  );

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <div className="brand-mark">M</div>
          <div>
            <div className="brand-name">MAX<b>.ai</b></div>
            <div className="brand-sub">UMP · PROJECT INTELLIGENCE</div>
          </div>
        </div>

        <div className="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search docs & insights…" />
        </div>

        <div className="grp">
          <div className="grp-h"><span>Projects</span><button className="grp-add" title="New project">+</button></div>
          <div className="proj-list">
            {visible.map((p) => (
              <div key={p.project_id} className={"proj" + (p.project_id === pid ? " on" : "")} onClick={() => setPid(p.project_id)}>
                <span className="proj-dot" style={{ background: ragDot(p.health.rag) }} />
                <span className="proj-star">★</span>
                <span className="proj-name">{p.name}</span>
                <span className="proj-count">{p.risk_count}</span>
                {p.project_id === pid && <span className="proj-x">×</span>}
              </div>
            ))}
            {!visible.length && <div className="proj-empty">No matches.</div>}
          </div>
        </div>

        <div className="grp">
          <div className="grp-h"><span>Workspace</span></div>
          <nav className="nav">
            {wsLink("/command", "◉", "Command Center")}
            {wsLink("/terminals", "🏬", "Terminals")}
            {wsLink("/portfolio", "▦", "Portfolio", projects.length)}
            {wsLink("/ingest", "⊕", "Ingest")}
            {wsLink("/dashboard", "◇", "Dashboard", 1)}
            {wsLink("/documents", "▤", "Documents", 1)}
            {wsLink("/foresight", "✦", "Foresight")}
            {wsLink("/lookahead", "📆", "Look-Ahead")}
            {wsLink("/synergy", "♻", "Synergy")}
            {wsLink("/strategy", "🧭", "Strategy")}
            {wsLink("/budget", "💷", "Budget")}
            {wsLink("/psl", "📇", "PSL")}
            {wsLink("/forecast", "📈", "Bag Forecast")}
            {wsLink("/risk", "⚠", "Risk Engine")}
            {wsLink("/chat", "◆", "Ask MAX")}
          </nav>
        </div>

        <div className="side-foot">
          <button className="theme-btn" onClick={toggleTheme}>🌙 Theme</button>
        </div>
      </aside>

      <main>
        <Routes>
          <Route path="/" element={<Navigate to="/command" />} />
          <Route path="/command" element={<CommandCenter pid={pid} />} />
          <Route path="/terminals" element={<Terminals onOpen={setPid} />} />
          <Route path="/portfolio" element={<Portfolio onOpen={setPid} />} />
          <Route path="/ingest" element={<Ingest pid={pid} />} />
          <Route path="/dashboard" element={<Dashboard onOpen={setPid} />} />
          <Route path="/documents" element={<Documents pid={pid} />} />
          <Route path="/foresight" element={<Foresight onOpen={setPid} />} />
          <Route path="/lookahead" element={<LookAhead pid={pid} />} />
          <Route path="/synergy" element={<Synergy onOpen={setPid} />} />
          <Route path="/strategy" element={<Strategy pid={pid} />} />
          <Route path="/budget" element={<Budget pid={pid} />} />
          <Route path="/psl" element={<PSL />} />
          <Route path="/forecast" element={<Forecast pid={pid} />} />
          <Route path="/risk" element={<RiskEngine pid={pid} />} />
          <Route path="/chat" element={<Chat pid={pid} />} />
        </Routes>
      </main>
    </div>
  );
}
