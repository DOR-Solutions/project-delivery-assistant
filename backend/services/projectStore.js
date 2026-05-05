const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');

const dataDirectory = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const dataFile = path.join(dataDirectory, 'projects.json');

const initialProjects = [
  {
    id: 'sample-discovery',
    userId: 'demo-user',
    title: 'Discovery workshop',
    description: 'Align stakeholders on scope, goals, and delivery risks.',
    status: 'in-progress',
    owner: 'Delivery Team',
    dueDate: '',
    tasks: [
      { id: 'sample-task-1', title: 'Confirm project goals', completed: true },
      { id: 'sample-task-2', title: 'Capture delivery risks', completed: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function ensureDataFile() {
  await fs.mkdir(dataDirectory, { recursive: true });

  try {
    await fs.access(dataFile);
  } catch (error) {
    await fs.writeFile(dataFile, JSON.stringify(initialProjects, null, 2));
  }
}

async function readProjects() {
  await ensureDataFile();
  const content = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(content);
}

async function writeProjects(projects) {
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.writeFile(dataFile, JSON.stringify(projects, null, 2));
}

function createId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
}

function normalizeTasks(tasks = []) {
  if (!Array.isArray(tasks)) {
    return [];
  }

  return tasks
    .map((task) => ({
      id: task.id || createId(),
      title: String(task.title || '').trim(),
      completed: Boolean(task.completed),
    }))
    .filter((task) => task.title.length > 0);
}

function validateProjectPayload(payload) {
  const title = String(payload.title || '').trim();

  if (!title) {
    const error = new Error('Project title is required');
    error.status = 400;
    throw error;
  }

  return {
    title,
    description: String(payload.description || '').trim(),
    status: payload.status || 'not-started',
    owner: String(payload.owner || '').trim(),
    dueDate: String(payload.dueDate || '').trim(),
    tasks: normalizeTasks(payload.tasks),
  };
}

async function listProjects(userId) {
  const projects = await readProjects();
  return projects
    .filter((project) => project.userId === userId)
    .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

async function getProject(id, userId) {
  const projects = await readProjects();
  return (
    projects.find((project) => project.id === id && project.userId === userId) || null
  );
}

async function createProject(payload, userId) {
  const now = new Date().toISOString();
  const projects = await readProjects();
  const project = {
    id: createId(),
    userId,
    ...validateProjectPayload(payload),
    createdAt: now,
    updatedAt: now,
  };

  projects.push(project);
  await writeProjects(projects);
  return project;
}

async function updateProject(id, payload, userId) {
  const projects = await readProjects();
  const index = projects.findIndex(
    (project) => project.id === id && project.userId === userId
  );

  if (index === -1) {
    return null;
  }

  const nextProject = {
    ...projects[index],
    ...validateProjectPayload({
      ...projects[index],
      ...payload,
    }),
    updatedAt: new Date().toISOString(),
  };

  projects[index] = nextProject;
  await writeProjects(projects);
  return nextProject;
}

async function deleteProject(id, userId) {
  const projects = await readProjects();
  const nextProjects = projects.filter(
    (project) => project.id !== id || project.userId !== userId
  );

  if (nextProjects.length === projects.length) {
    return false;
  }

  await writeProjects(nextProjects);
  return true;
}

module.exports = {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  updateProject,
};
