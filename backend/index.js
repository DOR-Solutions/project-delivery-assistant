const path = require('path');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Initialising the db module creates the SQLite file and schema on first run.
require('./db/database');

const projectsRouter = require('./routes/projects');
const tasksRouter = require('./routes/tasks');
const aiRouter = require('./routes/ai');
const analyticsRouter = require('./routes/analytics');
const aiService = require('./services/aiService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    aiEnabled: aiService.isEnabled(),
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/projects', projectsRouter);
app.use('/api/projects/:projectId/tasks', tasksRouter);
app.use('/api/ai', aiRouter);
app.use('/api/analytics', analyticsRouter);

// Serve the built frontend if present (production build).
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendDist));
app.get(/^(?!\/api|\/health).*/, (req, res, next) => {
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) next();
  });
});

// 404 for unmatched API routes
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Central error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Error:', err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal server error', status });
});

// Don't listen when imported by tests.
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Project Delivery Assistant API running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🤖 AI: ${aiService.isEnabled() ? 'Claude API enabled' : 'offline fallback (set ANTHROPIC_API_KEY to enable)'}`);
  });
}

module.exports = app;
