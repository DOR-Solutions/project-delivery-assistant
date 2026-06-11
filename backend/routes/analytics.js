const express = require('express');
const db = require('../db/database');

const router = express.Router();

/**
 * GET /api/analytics/overview
 * Portfolio-wide delivery metrics across all projects and tasks.
 */
router.get('/overview', (req, res) => {
  const projectStatus = db
    .prepare('SELECT status, COUNT(*) AS count FROM projects GROUP BY status')
    .all();
  const taskStatus = db
    .prepare('SELECT status, COUNT(*) AS count FROM tasks GROUP BY status')
    .all();

  const totalProjects = db.prepare('SELECT COUNT(*) AS n FROM projects').get().n;
  const totalTasks = db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
  const doneTasks = db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE status = 'done'").get().n;
  const blockedTasks = db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE status = 'blocked'").get().n;

  const overdueTasks = db
    .prepare(
      `SELECT COUNT(*) AS n FROM tasks
       WHERE status != 'done' AND due_date IS NOT NULL AND date(due_date) < date('now')`
    )
    .get().n;

  const completionRate = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  res.json({
    totals: { projects: totalProjects, tasks: totalTasks, doneTasks, blockedTasks, overdueTasks },
    completionRate,
    projectsByStatus: toMap(projectStatus),
    tasksByStatus: toMap(taskStatus),
  });
});

/**
 * GET /api/analytics/projects/:id
 * Per-project delivery health, including a simple risk signal.
 */
router.get('/projects/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const tasks = db.prepare('SELECT * FROM tasks WHERE project_id = ?').all(project.id);
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const overdue = tasks.filter(
    (t) => t.status !== 'done' && t.due_date && new Date(t.due_date) < new Date()
  ).length;

  const completionRate = total ? Math.round((done / total) * 100) : 0;

  // Lightweight, explainable risk heuristic.
  let riskScore = 0;
  if (blocked > 0) riskScore += 40;
  if (overdue > 0) riskScore += 30;
  if (project.due_date && new Date(project.due_date) < new Date() && project.status !== 'completed')
    riskScore += 30;
  if (total > 0 && completionRate < 30) riskScore += 10;
  riskScore = Math.min(100, riskScore);
  const riskLevel = riskScore >= 60 ? 'high' : riskScore >= 30 ? 'medium' : 'low';

  res.json({
    projectId: project.id,
    title: project.title,
    completionRate,
    tasks: { total, done, blocked, overdue },
    risk: { score: riskScore, level: riskLevel },
  });
});

function toMap(rows) {
  return rows.reduce((acc, r) => {
    acc[r.status] = r.count;
    return acc;
  }, {});
}

module.exports = router;
