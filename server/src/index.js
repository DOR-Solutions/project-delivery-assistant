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

// ─── In-memory Demo Data ─────────────────────────────────────────────────────

const projects = [
  {
    id: 1,
    name: 'Website Redesign',
    status: 'in-progress',
    progress: 65,
    dueDate: '2026-06-15',
    budget: 45000,
    spent: 29250,
    team: ['Alice Chen', 'Bob Martinez', 'Carol Davis'],
    description: 'Complete overhaul of corporate website with new branding',
  },
  {
    id: 2,
    name: 'Mobile App Launch',
    status: 'planning',
    progress: 20,
    dueDate: '2026-08-01',
    budget: 120000,
    spent: 24000,
    team: ['Dave Kim', 'Eve Johnson', 'Frank Lee', 'Grace Wang'],
    description: 'Native iOS and Android app for customer engagement',
  },
  {
    id: 3,
    name: 'API Integration',
    status: 'completed',
    progress: 100,
    dueDate: '2026-04-30',
    budget: 30000,
    spent: 28500,
    team: ['Henry Park', 'Iris Thompson'],
    description: 'Third-party payment and analytics API integrations',
  },
  {
    id: 4,
    name: 'Data Migration',
    status: 'at-risk',
    progress: 40,
    dueDate: '2026-05-20',
    budget: 55000,
    spent: 38500,
    team: ['Jack Wilson', 'Karen Liu', 'Leo Brown'],
    description: 'Migrate legacy database to cloud infrastructure',
  },
];

const tasks = [
  { id: 1, projectId: 1, title: 'Finalize homepage mockups', assignee: 'Alice Chen', status: 'completed', priority: 'high', dueDate: '2026-05-01' },
  { id: 2, projectId: 1, title: 'Implement responsive navigation', assignee: 'Bob Martinez', status: 'in-progress', priority: 'high', dueDate: '2026-05-10' },
  { id: 3, projectId: 1, title: 'Content migration', assignee: 'Carol Davis', status: 'todo', priority: 'medium', dueDate: '2026-05-20' },
  { id: 4, projectId: 2, title: 'User research & personas', assignee: 'Eve Johnson', status: 'completed', priority: 'high', dueDate: '2026-04-15' },
  { id: 5, projectId: 2, title: 'Wireframe key screens', assignee: 'Dave Kim', status: 'in-progress', priority: 'high', dueDate: '2026-05-12' },
  { id: 6, projectId: 2, title: 'Set up CI/CD pipeline', assignee: 'Frank Lee', status: 'todo', priority: 'medium', dueDate: '2026-05-25' },
  { id: 7, projectId: 4, title: 'Schema mapping document', assignee: 'Jack Wilson', status: 'completed', priority: 'high', dueDate: '2026-04-20' },
  { id: 8, projectId: 4, title: 'Test data migration scripts', assignee: 'Karen Liu', status: 'in-progress', priority: 'critical', dueDate: '2026-05-08' },
  { id: 9, projectId: 4, title: 'Production cutover plan', assignee: 'Leo Brown', status: 'todo', priority: 'high', dueDate: '2026-05-15' },
  { id: 10, projectId: 1, title: 'Performance optimization', assignee: 'Bob Martinez', status: 'todo', priority: 'low', dueDate: '2026-06-01' },
];

const milestones = [
  { id: 1, projectId: 1, title: 'Design Approval', date: '2026-05-05', status: 'completed' },
  { id: 2, projectId: 1, title: 'Beta Launch', date: '2026-05-30', status: 'upcoming' },
  { id: 3, projectId: 1, title: 'Go Live', date: '2026-06-15', status: 'upcoming' },
  { id: 4, projectId: 2, title: 'Design Complete', date: '2026-05-30', status: 'upcoming' },
  { id: 5, projectId: 2, title: 'Alpha Build', date: '2026-06-30', status: 'upcoming' },
  { id: 6, projectId: 4, title: 'Migration Test Complete', date: '2026-05-10', status: 'at-risk' },
  { id: 7, projectId: 4, title: 'Production Cutover', date: '2026-05-20', status: 'upcoming' },
];

// ─── AI Assistant Logic ──────────────────────────────────────────────────────

function generateAssistantResponse(message) {
  const lower = message.toLowerCase();

  if (lower.includes('status') || lower.includes('overview') || lower.includes('summary')) {
    const inProgress = projects.filter(p => p.status === 'in-progress').length;
    const atRisk = projects.filter(p => p.status === 'at-risk').length;
    const completed = projects.filter(p => p.status === 'completed').length;
    return `Here's your portfolio summary:\n\n` +
      `• **${projects.length} total projects** across the portfolio\n` +
      `• ${inProgress} in progress, ${completed} completed, ${atRisk} at risk\n` +
      `• Total budget: $${projects.reduce((s, p) => s + p.budget, 0).toLocaleString()}\n` +
      `• Total spent: $${projects.reduce((s, p) => s + p.spent, 0).toLocaleString()}\n\n` +
      `⚠️ **Data Migration** is at risk — it's 40% complete with only 16 days until deadline. I recommend scheduling a risk review meeting this week.`;
  }

  if (lower.includes('risk') || lower.includes('concern') || lower.includes('issue') || lower.includes('problem')) {
    return `I've identified the following risks:\n\n` +
      `🔴 **Data Migration** (Critical)\n` +
      `   - Only 40% complete, due May 20\n` +
      `   - Budget 70% consumed ($38.5K of $55K)\n` +
      `   - Migration test scripts still in progress\n\n` +
      `🟡 **Website Redesign** (Watch)\n` +
      `   - Content migration hasn't started yet\n` +
      `   - Beta launch milestone in 26 days\n\n` +
      `**Recommendation:** Escalate Data Migration to leadership. Consider adding resources or negotiating a deadline extension.`;
  }

  if (lower.includes('priorit') || lower.includes('this week') || lower.includes('focus') || lower.includes('today')) {
    return `Here are your top priorities this week:\n\n` +
      `1. 🚨 **Test data migration scripts** (Critical, due May 8)\n` +
      `   Karen Liu — Data Migration project\n\n` +
      `2. 🔴 **Implement responsive navigation** (High, due May 10)\n` +
      `   Bob Martinez — Website Redesign\n\n` +
      `3. 🔴 **Wireframe key screens** (High, due May 12)\n` +
      `   Dave Kim — Mobile App Launch\n\n` +
      `4. 🟡 **Production cutover plan** (High, due May 15)\n` +
      `   Leo Brown — Data Migration\n\n` +
      `Would you like me to send reminders to the team or schedule a standup?`;
  }

  if (lower.includes('deadline') || lower.includes('due') || lower.includes('timeline') || lower.includes('schedule')) {
    return `Upcoming deadlines:\n\n` +
      `| Date | Project | Milestone/Task |\n` +
      `|------|---------|----------------|\n` +
      `| May 8 | Data Migration | Test migration scripts |\n` +
      `| May 10 | Website Redesign | Responsive navigation |\n` +
      `| May 10 | Data Migration | Migration Test Complete |\n` +
      `| May 12 | Mobile App | Wireframe key screens |\n` +
      `| May 15 | Data Migration | Production cutover plan |\n` +
      `| May 20 | Data Migration | **Project Deadline** |\n` +
      `| May 30 | Website Redesign | Beta Launch |\n\n` +
      `The most pressing deadline is **Data Migration** on May 20. Three deliverables must complete before then.`;
  }

  if (lower.includes('budget') || lower.includes('cost') || lower.includes('spend') || lower.includes('money')) {
    const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
    const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
    return `Budget overview:\n\n` +
      `| Project | Budget | Spent | Remaining | Health |\n` +
      `|---------|--------|-------|-----------|--------|\n` +
      `| Website Redesign | $45K | $29.3K | $15.8K | ✅ On track |\n` +
      `| Mobile App Launch | $120K | $24K | $96K | ✅ Under budget |\n` +
      `| API Integration | $30K | $28.5K | $1.5K | ✅ Complete |\n` +
      `| Data Migration | $55K | $38.5K | $16.5K | ⚠️ Over-pacing |\n\n` +
      `**Total:** $${totalSpent.toLocaleString()} of $${totalBudget.toLocaleString()} (${Math.round(totalSpent/totalBudget*100)}% consumed)\n\n` +
      `Data Migration is spending faster than planned — 70% of budget used at 40% completion.`;
  }

  if (lower.includes('team') || lower.includes('who') || lower.includes('resource') || lower.includes('people')) {
    return `Team allocation across projects:\n\n` +
      `**Website Redesign** (3 members)\n` +
      `  Alice Chen, Bob Martinez, Carol Davis\n\n` +
      `**Mobile App Launch** (4 members)\n` +
      `  Dave Kim, Eve Johnson, Frank Lee, Grace Wang\n\n` +
      `**Data Migration** (3 members)\n` +
      `  Jack Wilson, Karen Liu, Leo Brown\n\n` +
      `**Total:** 12 team members across 4 active projects\n\n` +
      `💡 Consider reallocating a resource from Mobile App (which is in planning phase) to support Data Migration's tight deadline.`;
  }

  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return `Hello! I'm your Project Delivery Assistant. I can help you with:\n\n` +
      `• 📊 **Project status** — "Show me project status"\n` +
      `• ⚠️ **Risk analysis** — "What are the current risks?"\n` +
      `• 📅 **Deadlines** — "What's coming up this week?"\n` +
      `• 💰 **Budget tracking** — "How's our budget looking?"\n` +
      `• 👥 **Team overview** — "Who's working on what?"\n` +
      `• 🎯 **Priorities** — "What should I focus on today?"\n\n` +
      `What would you like to know?`;
  }

  if (lower.includes('help') || lower.includes('what can')) {
    return `I'm your AI-powered Project Delivery Assistant. Here's what I can help with:\n\n` +
      `📊 **Status & Overview** — Ask about project progress, completion rates\n` +
      `⚠️ **Risk Management** — Identify at-risk projects and bottlenecks\n` +
      `📅 **Schedule & Deadlines** — Track milestones and upcoming due dates\n` +
      `💰 **Budget Analysis** — Monitor spending vs. budget across projects\n` +
      `👥 **Resource Management** — See team allocation and availability\n` +
      `🎯 **Prioritization** — Get recommended focus areas for the week\n\n` +
      `Try asking: "What are my priorities this week?" or "Which projects are at risk?"`;
  }

  return `Based on your question, here's what I can tell you:\n\n` +
    `Your portfolio has **${projects.length} projects** with an overall health of 75%. ` +
    `The most urgent item is the **Data Migration** project which is at risk of missing its May 20 deadline.\n\n` +
    `Would you like me to:\n` +
    `• Show a detailed status breakdown?\n` +
    `• Identify risks and recommendations?\n` +
    `• List this week's priorities?\n\n` +
    `Just ask in natural language and I'll help!`;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'project-delivery-assistant',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.get('/api/dashboard', (_req, res) => {
  const totalBudget = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spent, 0);
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const totalTasks = tasks.length;

  res.json({
    stats: {
      totalProjects: projects.length,
      inProgress: projects.filter(p => p.status === 'in-progress').length,
      atRisk: projects.filter(p => p.status === 'at-risk').length,
      completed: projects.filter(p => p.status === 'completed').length,
      totalBudget,
      totalSpent,
      budgetUtilization: Math.round(totalSpent / totalBudget * 100),
      taskCompletion: Math.round(completedTasks / totalTasks * 100),
      completedTasks,
      totalTasks,
      teamSize: new Set(projects.flatMap(p => p.team)).size,
    },
    upcomingMilestones: milestones
      .filter(m => m.status !== 'completed')
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, 5),
  });
});

app.get('/api/projects', (_req, res) => {
  res.json({ projects });
});

app.get('/api/projects/:id', (req, res) => {
  const project = projects.find(p => p.id === parseInt(req.params.id));
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const projectMilestones = milestones.filter(m => m.projectId === project.id);

  res.json({ project, tasks: projectTasks, milestones: projectMilestones });
});

app.get('/api/tasks', (_req, res) => {
  res.json({ tasks });
});

app.post('/api/tasks', (req, res) => {
  const { title, projectId, assignee, priority, dueDate } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const newTask = {
    id: tasks.length + 1,
    projectId: projectId || 1,
    title,
    assignee: assignee || 'Unassigned',
    status: 'todo',
    priority: priority || 'medium',
    dueDate: dueDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  };
  tasks.push(newTask);
  res.status(201).json(newTask);
});

app.patch('/api/tasks/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { status, title, assignee, priority } = req.body;
  if (status) task.status = status;
  if (title) task.title = title;
  if (assignee) task.assignee = assignee;
  if (priority) task.priority = priority;

  res.json(task);
});

app.get('/api/milestones', (_req, res) => {
  res.json({ milestones });
});

app.post('/api/assistant/message', (req, res) => {
  const { message } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const content = generateAssistantResponse(message.trim());

  const response = {
    id: Date.now().toString(),
    role: 'assistant',
    content,
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
