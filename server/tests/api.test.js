const request = require('supertest');
const app = require('../src/index');

describe('API Endpoints', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('project-delivery-assistant');
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/projects', () => {
    it('should return list of projects', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.statusCode).toBe(200);
      expect(res.body.projects).toBeInstanceOf(Array);
      expect(res.body.projects.length).toBeGreaterThan(0);
      expect(res.body.projects[0]).toHaveProperty('name');
      expect(res.body.projects[0]).toHaveProperty('status');
    });
  });

  describe('POST /api/assistant/message', () => {
    it('should respond to a valid message', async () => {
      const res = await request(app)
        .post('/api/assistant/message')
        .send({ message: 'Hello assistant' });
      expect(res.statusCode).toBe(200);
      expect(res.body.role).toBe('assistant');
      expect(res.body.content).toContain('Hello assistant');
      expect(res.body.id).toBeDefined();
    });

    it('should return 400 for missing message', async () => {
      const res = await request(app)
        .post('/api/assistant/message')
        .send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Message is required');
    });

    it('should return 400 for empty message', async () => {
      const res = await request(app)
        .post('/api/assistant/message')
        .send({ message: '   ' });
      expect(res.statusCode).toBe(400);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.statusCode).toBe(404);
    });
  });
});
