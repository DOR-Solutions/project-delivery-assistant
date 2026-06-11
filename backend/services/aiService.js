/**
 * AI service backed by the Claude API.
 *
 * If ANTHROPIC_API_KEY is set, requests are sent to Claude. Otherwise the
 * service degrades gracefully and returns helpful heuristic responses so the
 * application remains fully usable without a key.
 */
const Anthropic = require('@anthropic-ai/sdk');

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';
const apiKey = process.env.ANTHROPIC_API_KEY;

const client = apiKey ? new Anthropic({ apiKey }) : null;

/** @returns {boolean} true when a real Claude key is configured. */
function isEnabled() {
  return Boolean(client);
}

const SYSTEM_PROMPT = `You are a Project Delivery Assistant — a virtual project
manager. You help teams plan work, break projects into tasks, surface risks and
blockers, and keep delivery on track. Be concise, specific, and actionable.
When given project and task data, ground your answer in it. Prefer short
paragraphs and bullet points. Never invent task IDs or data you were not given.`;

/**
 * Render project + task context as compact text the model can reason over.
 * @param {{project?: object, tasks?: object[]}} [context]
 * @returns {string}
 */
function formatContext(context = {}) {
  const { project, tasks } = context;
  if (!project && (!tasks || tasks.length === 0)) return '';

  const lines = ['Current project context:'];
  if (project) {
    lines.push(
      `- Project: "${project.title}" (status: ${project.status}, priority: ${project.priority}` +
        (project.due_date ? `, due: ${project.due_date}` : '') +
        `)`
    );
    if (project.description) lines.push(`  Description: ${project.description}`);
  }
  if (tasks && tasks.length) {
    lines.push(`- Tasks (${tasks.length}):`);
    for (const t of tasks) {
      lines.push(
        `  • [${t.status}] ${t.title}` +
          (t.assignee ? ` — ${t.assignee}` : '') +
          (t.due_date ? ` (due ${t.due_date})` : '')
      );
    }
  }
  return lines.join('\n');
}

/**
 * Ask the assistant a question, optionally grounded in project/task context
 * and prior conversation turns.
 *
 * @param {string} message - The user's message.
 * @param {object} [opts]
 * @param {{role: 'user'|'assistant', content: string}[]} [opts.history] - Prior turns.
 * @param {{project?: object, tasks?: object[]}} [opts.context] - Grounding data.
 * @returns {Promise<{reply: string, model: string, fallback: boolean}>}
 */
async function chat(message, opts = {}) {
  const { history = [], context = {} } = opts;
  const contextText = formatContext(context);

  if (!client) {
    return {
      reply: fallbackReply(message, context),
      model: 'fallback',
      fallback: true,
    };
  }

  const messages = [
    ...history
      .filter((m) => m && m.content)
      .map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content),
      })),
    {
      role: 'user',
      content: contextText ? `${contextText}\n\nQuestion: ${message}` : message,
    },
  ];

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM_PROMPT,
    messages,
  });

  const reply = response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
    .trim();

  return { reply, model: response.model || MODEL, fallback: false };
}

/**
 * Produce a deterministic, useful response when no API key is configured.
 * @param {string} message
 * @param {{project?: object, tasks?: object[]}} context
 * @returns {string}
 */
function fallbackReply(message, context = {}) {
  const { project, tasks = [] } = context;
  const parts = [];

  parts.push(
    "I'm running in offline mode (no ANTHROPIC_API_KEY configured), so here is a rule-based summary instead of a full AI answer."
  );

  if (project) {
    parts.push(
      `\nProject "${project.title}" is currently **${project.status}** with **${project.priority}** priority` +
        (project.due_date ? `, due ${project.due_date}.` : '.')
    );
  }

  if (tasks.length) {
    const byStatus = tasks.reduce((acc, t) => {
      acc[t.status] = (acc[t.status] || 0) + 1;
      return acc;
    }, {});
    const summary = Object.entries(byStatus)
      .map(([s, n]) => `${n} ${s.replace('_', ' ')}`)
      .join(', ');
    parts.push(`Task breakdown: ${summary}.`);

    const blocked = tasks.filter((t) => t.status === 'blocked');
    if (blocked.length) {
      parts.push(
        `⚠️ ${blocked.length} blocked task(s) need attention: ` +
          blocked.map((t) => t.title).join(', ') +
          '.'
      );
    }
    const open = tasks.filter((t) => t.status !== 'done');
    if (open.length) {
      parts.push(
        `Next up: focus on the ${open.length} open task(s), prioritising blocked and high-priority items first.`
      );
    } else {
      parts.push('🎉 All tasks are done — this project looks ready to deliver.');
    }
  } else if (project) {
    parts.push('No tasks yet. Consider breaking this project into 3–6 concrete, deliverable tasks.');
  }

  parts.push(
    '\nTip: set ANTHROPIC_API_KEY in backend/.env to unlock full AI planning and Q&A.'
  );

  return parts.join('\n');
}

module.exports = { chat, isEnabled, formatContext };
