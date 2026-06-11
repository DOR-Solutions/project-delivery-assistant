import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api';

const TASK_STATUSES = ['todo', 'in_progress', 'done', 'blocked'];

export default function ProjectDetail({ projectId, onChanged, onDeleted }) {
  const [project, setProject] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState(null);
  const [newTask, setNewTask] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState('medium');

  const load = useCallback(async () => {
    try {
      const [proj, stats] = await Promise.all([
        api.getProject(projectId),
        api.projectAnalytics(projectId),
      ]);
      setProject(proj);
      setAnalytics(stats);
      setError(null);
    } catch (err) {
      setError(err.message);
    }
  }, [projectId]);

  useEffect(() => {
    load();
  }, [load]);

  const addTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    try {
      await api.createTask(projectId, { title: newTask.trim(), priority: newTaskPriority });
      setNewTask('');
      setNewTaskPriority('medium');
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const changeTaskStatus = async (task, status) => {
    try {
      await api.updateTask(projectId, task.id, { status });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeTask = async (task) => {
    try {
      await api.deleteTask(projectId, task.id);
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const changeProjectStatus = async (status) => {
    try {
      await api.updateProject(projectId, { status });
      await load();
      onChanged?.();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteProject = async () => {
    if (!window.confirm(`Delete project "${project?.title}" and all its tasks?`)) return;
    try {
      await api.deleteProject(projectId);
      onDeleted?.();
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <div className="banner error">⚠️ {error}</div>;
  if (!project) return <p className="muted">Loading project…</p>;

  return (
    <div className="project-detail">
      <div className="detail-header">
        <div>
          <h2>{project.title}</h2>
          {project.description && <p className="muted">{project.description}</p>}
        </div>
        <button className="danger" onClick={deleteProject}>
          Delete
        </button>
      </div>

      <div className="detail-controls">
        <label>
          Status:&nbsp;
          <select value={project.status} onChange={(e) => changeProjectStatus(e.target.value)}>
            <option value="active">Active</option>
            <option value="on_hold">On hold</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <span className={`priority-tag ${project.priority}`}>{project.priority} priority</span>
        {project.due_date && <span className="muted">Due {project.due_date}</span>}
      </div>

      {analytics && (
        <div className="metrics">
          <Metric label="Completion" value={`${analytics.completionRate}%`} />
          <Metric label="Tasks" value={analytics.tasks.total} />
          <Metric label="Blocked" value={analytics.tasks.blocked} highlight={analytics.tasks.blocked > 0} />
          <Metric label="Overdue" value={analytics.tasks.overdue} highlight={analytics.tasks.overdue > 0} />
          <Metric label="Risk" value={analytics.risk.level} highlight={analytics.risk.level !== 'low'} />
        </div>
      )}

      <h3>Tasks</h3>
      <form className="new-task" onSubmit={addTask}>
        <input
          type="text"
          placeholder="New task…"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <select value={newTaskPriority} onChange={(e) => setNewTaskPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button type="submit" disabled={!newTask.trim()}>
          Add Task
        </button>
      </form>

      {project.tasks.length === 0 ? (
        <p className="muted">No tasks yet.</p>
      ) : (
        <ul className="task-list">
          {project.tasks.map((task) => (
            <li key={task.id} className={`task status-${task.status}`}>
              <span className={`priority-dot ${task.priority}`} title={task.priority} />
              <span className="task-title">{task.title}</span>
              {task.assignee && <span className="assignee">{task.assignee}</span>}
              <select
                value={task.status}
                onChange={(e) => changeTaskStatus(task, e.target.value)}
              >
                {TASK_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s.replace('_', ' ')}
                  </option>
                ))}
              </select>
              <button className="icon-btn" title="Delete task" onClick={() => removeTask(task)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
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
