const express = require('express');
const db = require('../db/database');
const aiService = require('../services/aiService');

const router = express.Router();

/** Load grounding context (project + tasks) for a given project id. */
function loadContext(projectId) {
  if (!projectId) return {};
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return {};
  const tasks = db
    .prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at ASC')
    .all(projectId);
  return { project, tasks };
}

// GET /api/ai/status — is the real AI enabled?
router.get('/status', (req, res) => {
  res.json({ enabled: aiService.isEnabled() });
});

// POST /api/ai/chat — chat with the assistant, optionally grounded in a project
// body: { message, projectId?, history?: [{role, content}] }
router.post('/chat', async (req, res, next) => {
  try {
    const { message, projectId, history } = req.body || {};
    if (!message || !String(message).trim()) {
      return res.status(400).json({ error: 'message is required' });
    }

    const context = loadContext(projectId);
    const result = await aiService.chat(String(message), {
      history: Array.isArray(history) ? history.slice(-10) : [],
      context,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
