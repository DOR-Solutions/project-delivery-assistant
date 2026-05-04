import { useState, useEffect } from 'react';

function App() {
  const [projects, setProjects] = useState([]);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      const data = await res.json();
      setProjects(data.projects);
    } catch (err) {
      console.error('Failed to fetch projects:', err);
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
        { role: 'assistant', content: 'Sorry, something went wrong.', id: 'error' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10b981';
      case 'in-progress': return '#3b82f6';
      case 'planning': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Project Delivery Assistant</h1>
        <p>AI-powered project management</p>
      </header>

      <main className="main">
        <section className="projects-section">
          <h2>Projects</h2>
          <div className="projects-grid">
            {projects.map((project) => (
              <div key={project.id} className="project-card">
                <div className="project-header">
                  <h3>{project.name}</h3>
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(project.status) }}
                  >
                    {project.status}
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <p className="progress-text">{project.progress}% complete</p>
                <p className="due-date">Due: {project.dueDate}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="chat-section">
          <h2>Assistant</h2>
          <div className="chat-messages">
            {chatHistory.length === 0 && (
              <p className="chat-placeholder">
                Ask me about your projects, deadlines, or task priorities...
              </p>
            )}
            {chatHistory.map((msg) => (
              <div key={msg.id} className={`chat-message ${msg.role}`}>
                <strong>{msg.role === 'user' ? 'You' : 'Assistant'}:</strong>
                <p>{msg.content}</p>
              </div>
            ))}
            {loading && <p className="loading">Thinking...</p>}
          </div>
          <form onSubmit={sendMessage} className="chat-form">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={loading}
            />
            <button type="submit" disabled={loading || !message.trim()}>
              Send
            </button>
          </form>
        </section>
      </main>
    </div>
  );
}

export default App;
