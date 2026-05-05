const cors = require('cors');
const dotenv = require('dotenv');
const express = require('express');
const authRouter = require('./routes/auth');
const projectsRouter = require('./routes/projects');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'project-delivery-assistant-api',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api/auth', authRouter);
app.use('/api/projects', projectsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.use((err, req, res, _next) => {
  if (err.status >= 500 || !err.status) {
    console.error(err);
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Project Delivery Assistant API listening on port ${PORT}`);
  });
}

module.exports = app;
