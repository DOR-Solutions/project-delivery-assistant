const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const fs = require('fs/promises');
const path = require('path');
const { createToken } = require('../middleware/auth');

const dataDirectory = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const usersFile = path.join(dataDirectory, 'users.json');

async function ensureUsersFile() {
  await fs.mkdir(dataDirectory, { recursive: true });

  try {
    await fs.access(usersFile);
  } catch (error) {
    await fs.writeFile(usersFile, JSON.stringify([], null, 2));
  }
}

async function readUsers() {
  await ensureUsersFile();
  const content = await fs.readFile(usersFile, 'utf8');
  return JSON.parse(content);
}

async function writeUsers(users) {
  await fs.mkdir(dataDirectory, { recursive: true });
  await fs.writeFile(usersFile, JSON.stringify(users, null, 2));
}

function createId() {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return crypto.randomBytes(16).toString('hex');
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function toPublicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
  };
}

async function createUser(payload) {
  const name = String(payload.name || '').trim();
  const email = normalizeEmail(payload.email);
  const password = String(payload.password || '');

  if (!name) {
    const error = new Error('Name is required');
    error.status = 400;
    throw error;
  }

  if (!email || !email.includes('@')) {
    const error = new Error('A valid email is required');
    error.status = 400;
    throw error;
  }

  if (password.length < 8) {
    const error = new Error('Password must be at least 8 characters');
    error.status = 400;
    throw error;
  }

  const users = await readUsers();
  const existingUser = users.find((user) => user.email === email);

  if (existingUser) {
    const error = new Error('An account already exists for this email');
    error.status = 409;
    throw error;
  }

  const now = new Date().toISOString();
  const user = {
    id: createId(),
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    createdAt: now,
    updatedAt: now,
  };

  users.push(user);
  await writeUsers(users);

  return toPublicUser(user);
}

async function findUserByEmail(email) {
  const users = await readUsers();
  return users.find((user) => user.email === normalizeEmail(email)) || null;
}

async function findUserById(id) {
  const users = await readUsers();
  return users.find((user) => user.id === id) || null;
}

async function verifyUserCredentials(email, password) {
  const user = await findUserByEmail(email);

  if (!user) {
    return null;
  }

  const isValidPassword = await bcrypt.compare(String(password || ''), user.passwordHash);
  return isValidPassword ? toPublicUser(user) : null;
}

function createUserSession(user) {
  return {
    token: createToken(user),
    user: toPublicUser(user),
  };
}

module.exports = {
  createUser,
  createUserSession,
  findUserById,
  toPublicUser,
  verifyUserCredentials,
};
