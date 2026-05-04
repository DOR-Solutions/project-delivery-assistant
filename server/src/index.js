const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'project-delivery-assistant',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.get('/api/projects', (_req, res) => {
  res.json({
    projects: [
      {
        id: 1,
        name: 'Website Redesign',
        status: 'in-progress',
        progress: 65,
        dueDate: '2026-06-15',
      },
      {
        id: 2,
        name: 'Mobile App Launch',
        status: 'planning',
        progress: 20,
        dueDate: '2026-08-01',
      },
      {
        id: 3,
        name: 'API Integration',
        status: 'completed',
        progress: 100,
        dueDate: '2026-04-30',
      },
    ],
  });
});

app.post('/api/assistant/message', (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const response = {
    id: Date.now().toString(),
    role: 'assistant',
    content: `I received your message: "${message}". As your Project Delivery Assistant, I can help you manage tasks, track progress, and provide insights on your projects.`,
    timestamp: new Date().toISOString(),
  };

  res.json(response);
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
