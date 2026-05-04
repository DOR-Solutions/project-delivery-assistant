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

  describe('GET /api/dashboard', () => {
    it('should return dashboard stats and milestones', async () => {
      const res = await request(app).get('/api/dashboard');
      expect(res.statusCode).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.totalProjects).toBe(4);
      expect(res.body.stats.teamSize).toBeGreaterThan(0);
      expect(res.body.upcomingMilestones).toBeInstanceOf(Array);
    });
  });

  describe('GET /api/projects', () => {
    it('should return list of projects', async () => {
      const res = await request(app).get('/api/projects');
      expect(res.statusCode).toBe(200);
      expect(res.body.projects).toBeInstanceOf(Array);
      expect(res.body.projects.length).toBe(4);
      expect(res.body.projects[0]).toHaveProperty('name');
      expect(res.body.projects[0]).toHaveProperty('budget');
      expect(res.body.projects[0]).toHaveProperty('team');
    });
  });

  describe('GET /api/projects/:id', () => {
    it('should return project details with tasks and milestones', async () => {
      const res = await request(app).get('/api/projects/1');
      expect(res.statusCode).toBe(200);
      expect(res.body.project.name).toBe('Website Redesign');
      expect(res.body.tasks).toBeInstanceOf(Array);
      expect(res.body.milestones).toBeInstanceOf(Array);
    });

    it('should return 404 for non-existent project', async () => {
      const res = await request(app).get('/api/projects/999');
      expect(res.statusCode).toBe(404);
    });
  });

  describe('GET /api/tasks', () => {
    it('should return all tasks', async () => {
      const res = await request(app).get('/api/tasks');
      expect(res.statusCode).toBe(200);
      expect(res.body.tasks).toBeInstanceOf(Array);
      expect(res.body.tasks.length).toBeGreaterThan(0);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({ title: 'New test task', projectId: 1 });
      expect(res.statusCode).toBe(201);
      expect(res.body.title).toBe('New test task');
      expect(res.body.status).toBe('todo');
    });

    it('should return 400 for missing title', async () => {
      const res = await request(app)
        .post('/api/tasks')
        .send({});
      expect(res.statusCode).toBe(400);
    });
  });

  describe('PATCH /api/tasks/:id', () => {
    it('should update task status', async () => {
      const res = await request(app)
        .patch('/api/tasks/1')
        .send({ status: 'completed' });
      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('completed');
    });
  });

  describe('POST /api/assistant/message', () => {
    it('should respond to status queries with project data', async () => {
      const res = await request(app)
        .post('/api/assistant/message')
        .send({ message: 'Show me project status' });
      expect(res.statusCode).toBe(200);
      expect(res.body.role).toBe('assistant');
      expect(res.body.content).toContain('portfolio');
    });

    it('should respond to priority queries', async () => {
      const res = await request(app)
        .post('/api/assistant/message')
        .send({ message: 'What are my priorities this week?' });
      expect(res.statusCode).toBe(200);
      expect(res.body.content).toContain('priorities');
    });

    it('should respond to risk queries', async () => {
      const res = await request(app)
        .post('/api/assistant/message')
        .send({ message: 'What are the risks?' });
      expect(res.statusCode).toBe(200);
      expect(res.body.content).toContain('Data Migration');
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
