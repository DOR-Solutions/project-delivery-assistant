/**
 * Integration tests for the API. Uses an in-memory SQLite database so it never
 * touches the real data file.
 * Run with: npm test   (from the backend directory)
 */
process.env.DB_PATH = ':memory:';
delete process.env.ANTHROPIC_API_KEY; // force offline fallback for deterministic AI tests

const { test } = require('node:test');
const assert = require('node:assert');
const app = require('../index');

const PORT = 5599;
let server;

test.before(() => {
  server = app.listen(PORT);
});

test.after(() => {
  server.close();
});

const base = () => `http://localhost:${PORT}`;

test('health check reports ok', async () => {
  const res = await fetch(`${base()}/health`);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.status, 'ok');
});

test('project + task lifecycle', async () => {
  // Create a project
  let res = await fetch(`${base()}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'Test Project', priority: 'high' }),
  });
  assert.equal(res.status, 201);
  const project = await res.json();
  assert.equal(project.title, 'Test Project');
  assert.equal(project.taskCount, 0);

  // Reject invalid project
  res = await fetch(`${base()}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: '' }),
  });
  assert.equal(res.status, 400);

  // Add a task
  res = await fetch(`${base()}/api/projects/${project.id}/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: 'First task', status: 'blocked' }),
  });
  assert.equal(res.status, 201);
  const task = await res.json();
  assert.equal(task.status, 'blocked');

  // Update the task to done
  res = await fetch(`${base()}/api/projects/${project.id}/tasks/${task.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'done' }),
  });
  const updated = await res.json();
  assert.equal(updated.status, 'done');

  // Project detail includes the task
  res = await fetch(`${base()}/api/projects/${project.id}`);
  const detail = await res.json();
  assert.equal(detail.tasks.length, 1);

  // Analytics reflects completion
  res = await fetch(`${base()}/api/analytics/projects/${project.id}`);
  const analytics = await res.json();
  assert.equal(analytics.completionRate, 100);

  // Delete the project
  res = await fetch(`${base()}/api/projects/${project.id}`, { method: 'DELETE' });
  assert.equal(res.status, 200);
});

test('ai chat returns a fallback reply when no key is set', async () => {
  const res = await fetch(`${base()}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'How is my project doing?' }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.fallback, true);
  assert.ok(body.reply.length > 0);
});
