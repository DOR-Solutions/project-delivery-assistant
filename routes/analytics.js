const express = require('express');
const router = express.Router();

router.get('/summary', (req, res) => {
  res.json({
    totalProjects: 0,
    completedTasks: 0,
    pendingTasks: 0,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;
