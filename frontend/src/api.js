// Thin API client. Uses same-origin relative URLs; Vite proxies /api to the
// backend in dev, and in production the backend serves the built frontend.

async function request(path, options = {}) {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.error) message = body.error;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  // Projects
  listProjects: () => request('/projects'),
  getProject: (id) => request(`/projects/${id}`),
  createProject: (data) => request('/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id, data) => request(`/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id) => request(`/projects/${id}`, { method: 'DELETE' }),

  // Tasks
  createTask: (projectId, data) =>
    request(`/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
  updateTask: (projectId, taskId, data) =>
    request(`/projects/${projectId}/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTask: (projectId, taskId) =>
    request(`/projects/${projectId}/tasks/${taskId}`, { method: 'DELETE' }),

  // Analytics
  overview: () => request('/analytics/overview'),
  projectAnalytics: (id) => request(`/analytics/projects/${id}`),

  // AI
  aiStatus: () => request('/ai/status'),
  aiChat: (data) => request('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
};
