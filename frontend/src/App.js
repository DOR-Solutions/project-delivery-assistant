import React, { useEffect, useMemo, useState } from 'react';
import ProjectList from './components/ProjectList';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const initialForm = {
  title: '',
  owner: '',
  status: 'not-started',
  dueDate: '',
  description: '',
  tasks: '',
};

function App() {
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const projectStats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((project) => project.status === 'complete').length;
    const blocked = projects.filter((project) => project.status === 'blocked').length;

    return { total, completed, blocked };
  }, [projects]);

  async function loadProjects() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/projects`);

      if (!response.ok) {
        throw new Error('Unable to load projects');
      }

      const data = await response.json();
      setProjects(data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects();
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function createProject(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const tasks = form.tasks
        .split('\n')
        .map((title) => ({ title }))
        .filter((task) => task.title.trim());

      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...form,
          tasks,
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Unable to create project');
      }

      const project = await response.json();
      setProjects((current) => [project, ...current]);
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(project, status) {
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...project, status }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Unable to update project');
      }

      const updatedProject = await response.json();
      setProjects((current) =>
        current.map((item) => (item.id === updatedProject.id ? updatedProject : item))
      );
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function removeProject(projectId) {
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Unable to delete project');
      }

      setProjects((current) => current.filter((project) => project.id !== projectId));
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Delivery command center</p>
          <h1>Project Delivery Assistant</h1>
          <p>
            Track ownership, milestones, and risk signals for active delivery work.
          </p>
        </div>
        <div className="stats-grid" aria-label="Project summary">
          <div>
            <span>{projectStats.total}</span>
            <small>Total projects</small>
          </div>
          <div>
            <span>{projectStats.completed}</span>
            <small>Completed</small>
          </div>
          <div>
            <span>{projectStats.blocked}</span>
            <small>Blocked</small>
          </div>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <main className="content-grid">
        <section className="panel">
          <h2>Create a project</h2>
          <form onSubmit={createProject} className="project-form">
            <label>
              Project title
              <input
                name="title"
                value={form.title}
                onChange={updateField}
                placeholder="Client portal launch"
                required
              />
            </label>

            <label>
              Owner
              <input
                name="owner"
                value={form.owner}
                onChange={updateField}
                placeholder="Delivery lead"
              />
            </label>

            <div className="form-row">
              <label>
                Status
                <select name="status" value={form.status} onChange={updateField}>
                  <option value="not-started">Not started</option>
                  <option value="in-progress">In progress</option>
                  <option value="blocked">Blocked</option>
                  <option value="complete">Complete</option>
                </select>
              </label>

              <label>
                Due date
                <input
                  name="dueDate"
                  type="date"
                  value={form.dueDate}
                  onChange={updateField}
                />
              </label>
            </div>

            <label>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={updateField}
                placeholder="What needs to be delivered?"
                rows="4"
              />
            </label>

            <label>
              Tasks
              <textarea
                name="tasks"
                value={form.tasks}
                onChange={updateField}
                placeholder={'One task per line\nConfirm scope\nSchedule kickoff'}
                rows="4"
              />
            </label>

            <button type="submit" disabled={saving}>
              {saving ? 'Saving...' : 'Add project'}
            </button>
          </form>
        </section>

        <section className="panel">
          <ProjectList
            loading={loading}
            projects={projects}
            onDelete={removeProject}
            onStatusChange={changeStatus}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
