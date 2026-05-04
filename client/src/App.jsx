import { useState, useEffect, useRef } from 'react';

function App() {
  const [projects, setProjects] = useState([]);
  const [dashboard, setDashboard] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: `Hello! I'm your **Project Delivery Assistant**. I can help you with:\n\n• 📊 Project status & overview\n• ⚠️ Risk analysis\n• 📅 Deadlines & schedules\n• 💰 Budget tracking\n• 👥 Team management\n• 🎯 Priority recommendations\n\nTry asking: "What are my priorities this week?"`,
    },
  ]);
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const chatEndRef = useRef(null);

  useEffect(() => {
    fetchDashboard();
    fetchProjects();
    fetchTasks();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/dashboard');
      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMsg = { role: 'user', content: message, id: Date.now().toString() };
    setChatHistory((prev) => [...prev, userMsg]);
    setMessage('');
    setLoading(true);

    try {
      const res = await fetch('/api/assistant/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });
      const data = await res.json();
      setChatHistory((prev) => [...prev, data]);
    } catch (err) {
      console.error('Failed to send message:', err);
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', id: 'error-' + Date.now() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (title, projectId) => {
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, projectId }),
      });
      const newTask = await res.json();
      setTasks((prev) => [...prev, newTask]);
    } catch (err) {
      console.error('Failed to add task:', err);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const updated = await res.json();
      setTasks((prev) => prev.map(t => t.id === updated.id ? updated : t));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in-progress': return '#3b82f6';
      case 'planning': return '#f59e0b';
      case 'at-risk': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getPriorityIcon = (priority) => {
    switch (priority) {
      case 'critical': return '🚨';
      case 'high': return '🔴';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '⚪';
    }
  };

  const formatMarkdown = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>');
  };

  const quickPrompts = [
    'What are my priorities this week?',
    'Which projects are at risk?',
    'Show me the budget overview',
    'What deadlines are coming up?',
  ];

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <div className="header-title">
            <h1>📋 Project Delivery Assistant</h1>
            <p>AI-powered project management dashboard</p>
          </div>
          <nav className="nav-tabs">
            <button
              className={`nav-tab ${activeView === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveView('dashboard')}
            >
              Dashboard
            </button>
            <button
              className={`nav-tab ${activeView === 'projects' ? 'active' : ''}`}
              onClick={() => setActiveView('projects')}
            >
              Projects
            </button>
            <button
              className={`nav-tab ${activeView === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveView('tasks')}
            >
              Tasks
            </button>
          </nav>
        </div>
      </header>

      <main className="main">
        <div className="content-area">
          {activeView === 'dashboard' && dashboard && (
            <DashboardView dashboard={dashboard} projects={projects} getStatusColor={getStatusColor} />
          )}
          {activeView === 'projects' && (
            <ProjectsView projects={projects} getStatusColor={getStatusColor} />
          )}
          {activeView === 'tasks' && (
            <TasksView
              tasks={tasks}
              projects={projects}
              getPriorityIcon={getPriorityIcon}
              getStatusColor={getStatusColor}
              updateTaskStatus={updateTaskStatus}
              addTask={addTask}
            />
          )}
        </div>

        <aside className="chat-panel">
          <div className="chat-header">
            <h3>🤖 AI Assistant</h3>
            <span className="online-badge">Online</span>
          </div>
          <div className="chat-messages">
            {chatHistory.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.role}`}>
                <div className="msg-avatar">{msg.role === 'user' ? '👤' : '🤖'}</div>
                <div className="msg-content">
                  <span
                    className="msg-text"
                    dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                  />
                  {msg.timestamp && (
                    <span className="msg-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="chat-message assistant">
                <div className="msg-avatar">🤖</div>
                <div className="msg-content"><span className="typing">Analyzing...</span></div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
          <div className="quick-prompts">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                className="quick-prompt-btn"
                onClick={() => setMessage(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>
          <form onSubmit={sendMessage} className="chat-form">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask about projects, risks, budgets..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !message.trim()}>
              Send
            </button>
          </form>
        </aside>
      </main>
    </div>
  );
}

function DashboardView({ dashboard, projects, getStatusColor }) {
  const { stats, upcomingMilestones } = dashboard;

  return (
    <div className="dashboard-view">
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">📁</span>
          <div className="stat-info">
            <span className="stat-value">{stats.totalProjects}</span>
            <span className="stat-label">Total Projects</span>
          </div>
        </div>
        <div className="stat-card highlight-blue">
          <span className="stat-icon">🔄</span>
          <div className="stat-info">
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>
        <div className="stat-card highlight-red">
          <span className="stat-icon">⚠️</span>
          <div className="stat-info">
            <span className="stat-value">{stats.atRisk}</span>
            <span className="stat-label">At Risk</span>
          </div>
        </div>
        <div className="stat-card highlight-green">
          <span className="stat-icon">✅</span>
          <div className="stat-info">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">💰</span>
          <div className="stat-info">
            <span className="stat-value">${(stats.totalSpent / 1000).toFixed(0)}K</span>
            <span className="stat-label">of ${(stats.totalBudget / 1000).toFixed(0)}K spent</span>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">👥</span>
          <div className="stat-info">
            <span className="stat-value">{stats.teamSize}</span>
            <span className="stat-label">Team Members</span>
          </div>
        </div>
      </div>

      <div className="dashboard-panels">
        <div className="panel">
          <h3>Project Health</h3>
          <div className="project-health-list">
            {projects.map((project) => (
              <div key={project.id} className="health-item">
                <div className="health-info">
                  <span className="health-name">{project.name}</span>
                  <span
                    className="health-badge"
                    style={{ backgroundColor: getStatusColor(project.status) }}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${project.progress}%`,
                      backgroundColor: getStatusColor(project.status),
                    }}
                  />
                </div>
                <span className="progress-pct">{project.progress}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3>Upcoming Milestones</h3>
          <div className="milestones-list">
            {upcomingMilestones.map((ms) => (
              <div key={ms.id} className={`milestone-item ${ms.status}`}>
                <span className="ms-icon">{ms.status === 'at-risk' ? '⚠️' : '📍'}</span>
                <div className="ms-info">
                  <span className="ms-title">{ms.title}</span>
                  <span className="ms-date">{ms.date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectsView({ projects, getStatusColor }) {
  return (
    <div className="projects-view">
      <h2>All Projects</h2>
      <div className="projects-grid">
        {projects.map((project) => (
          <div key={project.id} className="project-card-full">
            <div className="project-card-header">
              <h3>{project.name}</h3>
              <span
                className="status-badge"
                style={{ backgroundColor: getStatusColor(project.status) }}
              >
                {project.status}
              </span>
            </div>
            <p className="project-desc">{project.description}</p>
            <div className="progress-bar large">
              <div
                className="progress-fill"
                style={{
                  width: `${project.progress}%`,
                  backgroundColor: getStatusColor(project.status),
                }}
              />
            </div>
            <div className="project-meta">
              <span>📅 Due: {project.dueDate}</span>
              <span>💰 ${(project.spent / 1000).toFixed(1)}K / ${(project.budget / 1000).toFixed(0)}K</span>
            </div>
            <div className="project-team">
              <span>👥 {project.team.join(', ')}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TasksView({ tasks, projects, getPriorityIcon, getStatusColor, updateTaskStatus, addTask }) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskProject, setNewTaskProject] = useState(1);

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    addTask(newTaskTitle.trim(), newTaskProject);
    setNewTaskTitle('');
  };

  const statusOrder = { 'todo': 0, 'in-progress': 1, 'completed': 2 };
  const sortedTasks = [...tasks].sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

  return (
    <div className="tasks-view">
      <h2>Task Board</h2>
      <form onSubmit={handleAddTask} className="add-task-form">
        <input
          type="text"
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          placeholder="Add a new task..."
        />
        <select value={newTaskProject} onChange={(e) => setNewTaskProject(parseInt(e.target.value))}>
          {projects.filter(p => p.status !== 'completed').map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <button type="submit" disabled={!newTaskTitle.trim()}>Add Task</button>
      </form>
      <div className="tasks-list">
        {sortedTasks.map((task) => (
          <div key={task.id} className={`task-item ${task.status}`}>
            <span className="task-priority">{getPriorityIcon(task.priority)}</span>
            <div className="task-info">
              <span className={`task-title ${task.status === 'completed' ? 'done' : ''}`}>
                {task.title}
              </span>
              <span className="task-meta">
                {task.assignee} • {projects.find(p => p.id === task.projectId)?.name}
              </span>
            </div>
            <div className="task-actions">
              <select
                value={task.status}
                onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                style={{ borderColor: getStatusColor(task.status) }}
              >
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
