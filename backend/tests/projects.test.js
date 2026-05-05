const assert = require('assert');
const fs = require('fs/promises');
const os = require('os');
const path = require('path');

process.env.DATA_DIR = path.join(
  os.tmpdir(),
  `project-delivery-assistant-test-${process.pid}`
);

const app = require('../index');

const baseUrl = 'http://127.0.0.1:0';

async function request(server, route, options = {}) {
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}${route}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return { response, body };
}

async function run() {
  await fs.rm(process.env.DATA_DIR, { recursive: true, force: true });

  const server = app.listen(0);

  try {
    const health = await request(server, '/health');
    assert.strictEqual(health.response.status, 200);
    assert.strictEqual(health.body.status, 'ok');

    const blocked = await request(server, '/api/projects');
    assert.strictEqual(blocked.response.status, 401);

    const registered = await request(server, '/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Alex Delivery',
        email: 'alex@example.com',
        password: 'secret123',
      }),
    });
    assert.strictEqual(registered.response.status, 201);
    assert.ok(registered.body.token);
    assert.strictEqual(registered.body.user.email, 'alex@example.com');

    const token = registered.body.token;
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const login = await request(server, '/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'alex@example.com',
        password: 'secret123',
      }),
    });
    assert.strictEqual(login.response.status, 200);
    assert.ok(login.body.token);

    const secondRegistered = await request(server, '/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Blair Delivery',
        email: 'blair@example.com',
        password: 'secret123',
      }),
    });
    assert.strictEqual(secondRegistered.response.status, 201);

    const secondAuthHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secondRegistered.body.token}`,
    };

    const profile = await request(server, '/api/auth/me', {
      headers: authHeaders,
    });
    assert.strictEqual(profile.response.status, 200);
    assert.strictEqual(profile.body.user.name, 'Alex Delivery');

    const initial = await request(server, '/api/projects', {
      headers: authHeaders,
    });
    assert.strictEqual(initial.response.status, 200);
    assert.ok(Array.isArray(initial.body));
    assert.strictEqual(initial.body.length, 0);

    const created = await request(server, '/api/projects', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        title: 'Launch plan',
        description: 'Coordinate launch tasks',
        owner: 'Alex',
        status: 'blocked',
        tasks: [{ title: 'Book kickoff', completed: false }],
      }),
    });

    assert.strictEqual(created.response.status, 201);
    assert.strictEqual(created.body.title, 'Launch plan');
    assert.strictEqual(created.body.tasks.length, 1);

    const secondCreated = await request(server, '/api/projects', {
      method: 'POST',
      headers: secondAuthHeaders,
      body: JSON.stringify({
        title: 'Separate workspace',
        owner: 'Blair',
      }),
    });
    assert.strictEqual(secondCreated.response.status, 201);

    const firstUserProjects = await request(server, '/api/projects', {
      headers: authHeaders,
    });
    assert.strictEqual(firstUserProjects.response.status, 200);
    assert.deepStrictEqual(
      firstUserProjects.body.map((project) => project.id),
      [created.body.id]
    );

    const hiddenProject = await request(
      server,
      `/api/projects/${secondCreated.body.id}`,
      {
        headers: authHeaders,
      }
    );
    assert.strictEqual(hiddenProject.response.status, 404);

    const updated = await request(server, `/api/projects/${created.body.id}`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify({
        status: 'complete',
        tasks: [{ ...created.body.tasks[0], completed: true }],
      }),
    });

    assert.strictEqual(updated.response.status, 200);
    assert.strictEqual(updated.body.status, 'complete');
    assert.strictEqual(updated.body.tasks[0].completed, true);

    const deleted = await request(server, `/api/projects/${created.body.id}`, {
      method: 'DELETE',
      headers: authHeaders,
    });
    assert.strictEqual(deleted.response.status, 204);

    const invalid = await request(server, '/api/projects', {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ title: '' }),
    });
    assert.strictEqual(invalid.response.status, 400);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(process.env.DATA_DIR, { recursive: true, force: true });
  }
}

run()
  .then(() => {
    console.log('Backend API smoke tests passed');
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
