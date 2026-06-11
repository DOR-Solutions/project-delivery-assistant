const express = require('express');
const db = require('../db/database');

const router = express.Router();

const VALID_STATUS = ['active', 'on_hold', 'completed', 'archived'];
const VALID_PRIORITY = ['low', 'medium', 'high', 'critical'];

/** Attach the task count to a project row. */
function withTaskCount(project) {
  if (!project) return project;
  const { count } = db
    .prepare('SELECT COUNT(*) AS count FROM tasks WHERE project_id = ?')
    .get(project.id);
  return { ...project, taskCount: count };
}

// GET /api/projects — list all projects
router.get('/', (req, res) => {
  const projects = db
    .prepare('SELECT * FROM projects ORDER BY updated_at DESC')
    .all();
  res.json(projects.map(withTaskCount));
});

// GET /api/projects/:id — single project with its tasks
router.get('/:id', (req, res) => {
  const project = db
    .prepare('SELECT * FROM projects WHERE id = ?')
    .get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const tasks = db
    .prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC')
    .all(project.id);
  res.json({ ...project, tasks });
});

// POST /api/projects — create a project
router.post('/', (req, res) => {
  const { title, description = '', status = 'active', priority = 'medium', due_date = null, user_id = null } =
    req.body || {};

  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUS.join(', ')}` });
  }
  if (!VALID_PRIORITY.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of ${VALID_PRIORITY.join(', ')}` });
  }

  const info = db
    .prepare(
      `INSERT INTO projects (title, description, status, priority, due_date, user_id)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(String(title).trim(), description, status, priority, due_date, user_id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(withTaskCount(project));
});

// PUT /api/projects/:id — update a project
router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Project not found' });

  const { title, description, status, priority, due_date, user_id } = req.body || {};

  if (status !== undefined && !VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUS.join(', ')}` });
  }
  if (priority !== undefined && !VALID_PRIORITY.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of ${VALID_PRIORITY.join(', ')}` });
  }

  const merged = {
    title: title !== undefined ? String(title).trim() : existing.title,
    description: description !== undefined ? description : existing.description,
    status: status !== undefined ? status : existing.status,
    priority: priority !== undefined ? priority : existing.priority,
    due_date: due_date !== undefined ? due_date : existing.due_date,
    user_id: user_id !== undefined ? user_id : existing.user_id,
  };

  db.prepare(
    `UPDATE projects
     SET title = ?, description = ?, status = ?, priority = ?, due_date = ?, user_id = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(merged.title, merged.description, merged.status, merged.priority, merged.due_date, merged.user_id, req.params.id);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  res.json(withTaskCount(project));
});

// DELETE /api/projects/:id — delete a project (cascades to tasks)
router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ error: 'Project not found' });
  res.json({ success: true });
});

module.exports = router;
