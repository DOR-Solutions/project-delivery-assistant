/**
 * Seed the database with sample data for a quick start.
 * Usage: npm run seed   (from the backend directory)
 *
 * This clears existing projects/tasks/users and inserts a small demo set.
 */
const db = require('./database');

const seed = db.transaction(() => {
  db.exec('DELETE FROM tasks; DELETE FROM projects; DELETE FROM users;');

  const insertUser = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
  const ali = insertUser.run('Ali Zakaria', 'ali.zakaria@dor-solutions.com').lastInsertRowid;

  const insertProject = db.prepare(
    `INSERT INTO projects (title, description, status, priority, due_date, user_id)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const insertTask = db.prepare(
    `INSERT INTO tasks (title, description, status, priority, assignee, due_date, project_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );

  const website = insertProject.run(
    'Website Redesign',
    'Revamp the company marketing site with a new design system.',
    'active',
    'high',
    '2026-07-15',
    ali
  ).lastInsertRowid;

  insertTask.run('Audit current pages', 'Inventory existing content', 'done', 'medium', 'Ali', '2026-06-01', website);
  insertTask.run('Design system in Figma', '', 'in_progress', 'high', 'Sara', '2026-06-20', website);
  insertTask.run('Build component library', '', 'todo', 'high', 'Omar', '2026-07-01', website);
  insertTask.run('Migrate legacy CMS content', 'Blocked on CMS access', 'blocked', 'critical', 'Ali', '2026-06-10', website);

  const mobile = insertProject.run(
    'Mobile App Launch',
    'Ship v1 of the delivery tracking mobile app.',
    'active',
    'critical',
    '2026-08-30',
    ali
  ).lastInsertRowid;

  insertTask.run('Define MVP scope', '', 'done', 'high', 'Ali', '2026-05-15', mobile);
  insertTask.run('Set up CI/CD', '', 'in_progress', 'medium', 'Omar', '2026-06-25', mobile);
  insertTask.run('Beta test plan', '', 'todo', 'low', 'Sara', '2026-08-01', mobile);

  insertProject.run(
    'Q2 Internal Tooling',
    'Improve internal reporting dashboards.',
    'completed',
    'medium',
    '2026-05-30',
    ali
  );
});

seed();

const projectCount = db.prepare('SELECT COUNT(*) AS n FROM projects').get().n;
const taskCount = db.prepare('SELECT COUNT(*) AS n FROM tasks').get().n;
console.log(`✅ Seeded ${projectCount} projects and ${taskCount} tasks.`);
