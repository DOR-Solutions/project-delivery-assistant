import React, { useEffect, useState, useCallback } from 'react';
import { api } from './api';
import ProjectList from './components/ProjectList.jsx';
import ProjectDetail from './components/ProjectDetail.jsx';
import AnalyticsOverview from './components/AnalyticsOverview.jsx';
import AiChat from './components/AiChat.jsx';

export default function App() {
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [view, setView] = useState('projects'); // 'projects' | 'analytics'
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshProjects = useCallback(async () => {
    try {
      const data = await api.listProjects();
      setProjects(data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const handleSelect = (id) => {
    setSelectedId(id);
    setView('projects');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>📋 Project Delivery Assistant</h1>
        <nav>
          <button
            className={view === 'projects' ? 'active' : ''}
            onClick={() => setView('projects')}
          >
            Projects
          </button>
          <button
            className={view === 'analytics' ? 'active' : ''}
            onClick={() => setView('analytics')}
          >
            Analytics
          </button>
        </nav>
      </header>

      {error && <div className="banner error">⚠️ {error}</div>}

      <div className="layout">
        <aside className="sidebar">
          <ProjectList
            projects={projects}
            loading={loading}
            selectedId={selectedId}
            onSelect={handleSelect}
            onCreated={refreshProjects}
          />
        </aside>

        <main className="content">
          {view === 'analytics' ? (
            <AnalyticsOverview />
          ) : selectedId ? (
            <ProjectDetail
              projectId={selectedId}
              onChanged={refreshProjects}
              onDeleted={() => {
                setSelectedId(null);
                refreshProjects();
              }}
            />
          ) : (
            <div className="empty-state">
              <p>Select a project from the left, or create a new one to get started.</p>
            </div>
          )}
        </main>

        <aside className="assistant">
          <AiChat projectId={view === 'projects' ? selectedId : null} />
        </aside>
      </div>
    </div>
  );
}
