const express = require('express');
const router = express.Router();

let projects = [];
let nextId = 1;

router.get('/', (req, res) => {
  res.json(projects);
});

router.post('/', (req, res) => {
  const { title, description } = req.body;
  const project = { id: nextId++, title, description, createdAt: new Date().toISOString() };
  projects.push(project);
  res.status(201).json(project);
});

router.get('/:id', (req, res) => {
  const project = projects.find(p => p.id === parseInt(req.params.id));
  if (!project) return res.status(404).json({ error: 'Project not found' });
  res.json(project);
});

router.delete('/:id', (req, res) => {
  const idx = projects.findIndex(p => p.id === parseInt(req.params.id));
  if (idx === -1) return res.status(404).json({ error: 'Project not found' });
  projects.splice(idx, 1);
  res.json({ message: 'Project deleted' });
});

module.exports = router;
