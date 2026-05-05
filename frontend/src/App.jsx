import React, { useEffect, useMemo, useState } from 'react';
import ProjectList from './components/ProjectList.jsx';
import './App.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const SESSION_KEY = 'project-delivery-assistant-session';

const initialAuthForm = {
  name: '',
  email: '',
  password: '',
};

const initialProjectForm = {
  title: '',
  owner: '',
  status: 'not-started',
  dueDate: '',
  description: '',
  tasks: '',
};

function loadSavedSession() {
  try {
    const savedSession = window.localStorage.getItem(SESSION_KEY);
    return savedSession ? JSON.parse(savedSession) : null;
  } catch (error) {
    return null;
  }
}

function App() {
  const [session, setSession] = useState(loadSavedSession);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [projects, setProjects] = useState([]);
  const [projectForm, setProjectForm] = useState(initialProjectForm);
  const [loading, setLoading] = useState(Boolean(session));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const projectStats = useMemo(() => {
    const total = projects.length;
    const completed = projects.filter((project) => project.status === 'complete').length;
    const blocked = projects.filter((project) => project.status === 'blocked').length;
    const taskCount = projects.reduce(
      (count, project) => count + project.tasks.length,
      0
    );

    return { total, completed, blocked, taskCount };
  }, [projects]);

  function authHeaders() {
    return {
      Authorization: `Bearer ${session.token}`,
      'Content-Type': 'application/json',
    };
  }

  async function loadProjects() {
    if (!session) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/projects`, {
        headers: authHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          logout();
        }
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
    if (session) {
      loadProjects();
    }
  }, [session]);

  function updateProjectField(event) {
    const { name, value } = event.target;
    setProjectForm((current) => ({ ...current, [name]: value }));
  }

  function updateAuthField(event) {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
  }

  async function submitAuth(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const endpoint = authMode === 'login' ? 'login' : 'register';
      const response = await fetch(`${API_URL}/api/auth/${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authForm),
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.error || 'Unable to authenticate');
      }

      window.localStorage.setItem(SESSION_KEY, JSON.stringify(body));
      setSession(body);
      setAuthForm(initialAuthForm);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function logout() {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setProjects([]);
    setLoading(false);
  }

  async function createProject(event) {
    event.preventDefault();
    setSaving(true);
    setError('');

    try {
      const tasks = projectForm.tasks
        .split('\n')
        .map((title) => ({ title }))
        .filter((task) => task.title.trim());

      const response = await fetch(`${API_URL}/api/projects`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({
          ...projectForm,
          tasks,
        }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Unable to create project');
      }

      const project = await response.json();
      setProjects((current) => [project, ...current]);
      setProjectForm(initialProjectForm);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveProject(project, updates) {
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/projects/${project.id}`, {
        method: 'PUT',
        headers: authHeaders(),
        body: JSON.stringify({ ...project, ...updates }),
      });

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.error || 'Unable to update project');
      }

      const updatedProject = await response.json();
      setProjects((current) =>
        current.map((item) => (item.id === updatedProject.id ? updatedProject : item))
      );
      return updatedProject;
    } catch (requestError) {
      setError(requestError.message);
      return null;
    }
  }

  async function changeStatus(project, status) {
    await saveProject(project, { status });
  }

  async function updateProjectDetails(project, details) {
    return saveProject(project, details);
  }

  async function addTask(project, title) {
    const nextTaskTitle = title.trim();

    if (!nextTaskTitle) {
      return null;
    }

    return saveProject(project, {
      tasks: [...project.tasks, { title: nextTaskTitle, completed: false }],
    });
  }

  async function toggleTask(project, taskId) {
    return saveProject(project, {
      tasks: project.tasks.map((task) =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      ),
    });
  }

  async function deleteTask(project, taskId) {
    return saveProject(project, {
      tasks: project.tasks.filter((task) => task.id !== taskId),
    });
  }

  async function removeProject(projectId) {
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: authHeaders(),
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

  if (!session) {
    return (
      <div className="app-shell auth-layout">
        <section className="auth-hero">
          <p className="eyebrow">Team workspace</p>
          <h1>Project Delivery Assistant</h1>
          <p>
            Sign in to manage your delivery pipeline, track tasks, and keep each
            user's projects separate.
          </p>
        </section>

        <section className="panel auth-panel">
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
              type="button"
            >
              Log in
            </button>
            <button
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => setAuthMode('register')}
              type="button"
            >
              Create account
            </button>
          </div>

          {error && <div className="alert inline-alert">{error}</div>}

          <form className="project-form" onSubmit={submitAuth}>
            {authMode === 'register' && (
              <label>
                Name
                <input
                  autoComplete="name"
                  name="name"
                  onChange={updateAuthField}
                  placeholder="Jordan Lee"
                  value={authForm.name}
                />
              </label>
            )}

            <label>
              Email
              <input
                autoComplete="email"
                name="email"
                onChange={updateAuthField}
                placeholder="you@example.com"
                required
                type="email"
                value={authForm.email}
              />
            </label>

            <label>
              Password
              <input
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                minLength="8"
                name="password"
                onChange={updateAuthField}
                placeholder="At least 8 characters"
                required
                type="password"
                value={authForm.password}
              />
            </label>

            <button type="submit" disabled={saving}>
              {saving
                ? 'Please wait...'
                : authMode === 'login'
                  ? 'Log in'
                  : 'Create account'}
            </button>
          </form>
        </section>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Delivery command center</p>
          <h1>Project Delivery Assistant</h1>
          <p>
            Track ownership, milestones, and risk signals for active delivery work.
            Signed in as {session.user.name || session.user.email}.
          </p>
        </div>
        <div className="hero-side">
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
            <div>
              <span>{projectStats.taskCount}</span>
              <small>Tasks tracked</small>
            </div>
          </div>
          <button className="logout-button" onClick={logout} type="button">
            Log out
          </button>
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
                value={projectForm.title}
                onChange={updateProjectField}
                placeholder="Client portal launch"
                required
              />
            </label>

            <label>
              Owner
              <input
                name="owner"
                value={projectForm.owner}
                onChange={updateProjectField}
                placeholder="Delivery lead"
              />
            </label>

            <div className="form-row">
              <label>
                Status
                <select
                  name="status"
                  value={projectForm.status}
                  onChange={updateProjectField}
                >
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
                  value={projectForm.dueDate}
                  onChange={updateProjectField}
                />
              </label>
            </div>

            <label>
              Description
              <textarea
                name="description"
                value={projectForm.description}
                onChange={updateProjectField}
                placeholder="What needs to be delivered?"
                rows="4"
              />
            </label>

            <label>
              Tasks
              <textarea
                name="tasks"
                value={projectForm.tasks}
                onChange={updateProjectField}
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
            onAddTask={addTask}
            onDelete={removeProject}
            onDeleteTask={deleteTask}
            onEdit={updateProjectDetails}
            onStatusChange={changeStatus}
            onToggleTask={toggleTask}
          />
        </section>
      </main>
    </div>
  );
}

export default App;
