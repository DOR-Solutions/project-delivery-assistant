import React, { useState } from 'react';
import { api } from '../api';

export default function ProjectList({ projects, loading, selectedId, onSelect, onCreated }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('medium');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const project = await api.createProject({ title: title.trim(), priority });
      setTitle('');
      setPriority('medium');
      await onCreated();
      onSelect(project.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="project-list">
      <h2>Projects</h2>

      <form className="new-project" onSubmit={handleCreate}>
        <input
          type="text"
          placeholder="New project title…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button type="submit" disabled={submitting || !title.trim()}>
          {submitting ? 'Adding…' : 'Add Project'}
        </button>
      </form>
      {error && <p className="error-text">{error}</p>}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : projects.length === 0 ? (
        <p className="muted">No projects yet.</p>
      ) : (
        <ul>
          {projects.map((p) => (
            <li
              key={p.id}
              className={p.id === selectedId ? 'selected' : ''}
              onClick={() => onSelect(p.id)}
            >
              <div className="project-row-title">
                <span className={`priority-dot ${p.priority}`} title={p.priority} />
                {p.title}
              </div>
              <div className="project-row-meta">
                <span className={`status-badge ${p.status}`}>{p.status.replace('_', ' ')}</span>
                <span className="muted">{p.taskCount} task{p.taskCount === 1 ? '' : 's'}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
