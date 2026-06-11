const express = require('express');
const db = require('../db/database');

// mergeParams lets this router read :projectId when mounted under a project.
const router = express.Router({ mergeParams: true });

const VALID_STATUS = ['todo', 'in_progress', 'done', 'blocked'];
const VALID_PRIORITY = ['low', 'medium', 'high', 'critical'];

function projectExists(id) {
  return Boolean(db.prepare('SELECT 1 FROM projects WHERE id = ?').get(id));
}

// GET /api/projects/:projectId/tasks — list tasks for a project
router.get('/', (req, res) => {
  const { projectId } = req.params;
  if (!projectExists(projectId)) return res.status(404).json({ error: 'Project not found' });

  const tasks = db
    .prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC')
    .all(projectId);
  res.json(tasks);
});

// POST /api/projects/:projectId/tasks — create a task
router.post('/', (req, res) => {
  const { projectId } = req.params;
  if (!projectExists(projectId)) return res.status(404).json({ error: 'Project not found' });

  const { title, description = '', status = 'todo', priority = 'medium', assignee = '', due_date = null } =
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
      `INSERT INTO tasks (title, description, status, priority, assignee, due_date, project_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(String(title).trim(), description, status, priority, assignee, due_date, projectId);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(task);
});

// PUT /api/projects/:projectId/tasks/:taskId — update a task
router.put('/:taskId', (req, res) => {
  const { projectId, taskId } = req.params;
  const existing = db
    .prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?')
    .get(taskId, projectId);
  if (!existing) return res.status(404).json({ error: 'Task not found' });

  const { title, description, status, priority, assignee, due_date } = req.body || {};

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
    assignee: assignee !== undefined ? assignee : existing.assignee,
    due_date: due_date !== undefined ? due_date : existing.due_date,
  };

  db.prepare(
    `UPDATE tasks
     SET title = ?, description = ?, status = ?, priority = ?, assignee = ?, due_date = ?,
         updated_at = datetime('now')
     WHERE id = ?`
  ).run(merged.title, merged.description, merged.status, merged.priority, merged.assignee, merged.due_date, taskId);

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  res.json(task);
});

// DELETE /api/projects/:projectId/tasks/:taskId — delete a task
router.delete('/:taskId', (req, res) => {
  const { projectId, taskId } = req.params;
  const info = db
    .prepare('DELETE FROM tasks WHERE id = ? AND project_id = ?')
    .run(taskId, projectId);
  if (info.changes === 0) return res.status(404).json({ error: 'Task not found' });
  res.json({ success: true });
});

module.exports = router;
