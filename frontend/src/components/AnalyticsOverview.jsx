import React, { useEffect, useState } from 'react';
import { api } from '../api';

export default function AnalyticsOverview() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.overview().then(setData).catch((err) => setError(err.message));
  }, []);

  if (error) return <div className="banner error">⚠️ {error}</div>;
  if (!data) return <p className="muted">Loading analytics…</p>;

  const { totals, completionRate, projectsByStatus, tasksByStatus } = data;

  return (
    <div className="analytics">
      <h2>Portfolio Analytics</h2>

      <div className="metrics">
        <Metric label="Projects" value={totals.projects} />
        <Metric label="Tasks" value={totals.tasks} />
        <Metric label="Completion" value={`${completionRate}%`} />
        <Metric label="Blocked" value={totals.blockedTasks} highlight={totals.blockedTasks > 0} />
        <Metric label="Overdue" value={totals.overdueTasks} highlight={totals.overdueTasks > 0} />
      </div>

      <div className="breakdown-grid">
        <Breakdown title="Projects by status" data={projectsByStatus} />
        <Breakdown title="Tasks by status" data={tasksByStatus} />
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div className={`metric ${highlight ? 'highlight' : ''}`}>
      <div className="metric-value">{value}</div>
      <div className="metric-label">{label}</div>
    </div>
  );
}

function Breakdown({ title, data }) {
  const entries = Object.entries(data || {});
  const max = Math.max(1, ...entries.map(([, n]) => n));
  return (
    <div className="breakdown">
      <h3>{title}</h3>
      {entries.length === 0 ? (
        <p className="muted">No data.</p>
      ) : (
        entries.map(([status, count]) => (
          <div key={status} className="bar-row">
            <span className="bar-label">{status.replace('_', ' ')}</span>
            <div className="bar-track">
              <div className="bar-fill" style={{ width: `${(count / max) * 100}%` }} />
            </div>
            <span className="bar-count">{count}</span>
          </div>
        ))
      )}
    </div>
  );
}
