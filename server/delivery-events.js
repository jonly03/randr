const crypto = require('node:crypto');

const STATUS_BY_ACTION = {
  failure: 'red',
  cancelled: 'red',
  timed_out: 'red',
  action_required: 'yellow',
  neutral: 'yellow',
  skipped: 'yellow',
  success: 'green'
};

function safeEqual(left, right) {
  const a = Buffer.from(left || '');
  const b = Buffer.from(right || '');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function verifyGitHubSignature(rawBody, signature, secret) {
  if (!secret || !signature || !signature.startsWith('sha256=')) return false;
  const expected = `sha256=${crypto.createHmac('sha256', secret).update(rawBody).digest('hex')}`;
  return safeEqual(expected, signature);
}

function classifyGitHubEvent(eventName, payload) {
  if (eventName === 'workflow_run') {
    const run = payload.workflow_run || {};
    return {
      id: `github:workflow_run:${run.id}:${run.run_attempt || 1}`,
      type: 'github.workflow_run',
      signal: STATUS_BY_ACTION[run.conclusion] || (run.status === 'completed' ? 'yellow' : 'green'),
      headline: `${run.name || 'Workflow'} ${run.conclusion || run.status || 'updated'}`,
      summary: run.display_title || 'GitHub Actions workflow update',
      url: run.html_url || null,
      subject: { kind: 'workflow_run', id: String(run.id || ''), branch: run.head_branch || null, sha: run.head_sha || null }
    };
  }
  if (eventName === 'pull_request') {
    const pr = payload.pull_request || {};
    const action = payload.action || 'updated';
    return {
      id: `github:pull_request:${pr.number || payload.number}:${action}:${pr.updated_at || ''}`,
      type: 'github.pull_request',
      signal: ['closed', 'ready_for_review'].includes(action) ? 'green' : 'yellow',
      headline: `PR #${pr.number || payload.number} ${action.replaceAll('_', ' ')}`,
      summary: pr.title || 'Pull request update',
      url: pr.html_url || null,
      subject: { kind: 'pull_request', id: String(pr.number || payload.number || ''), branch: pr.head?.ref || null, sha: pr.head?.sha || null }
    };
  }
  if (eventName === 'issues' || eventName === 'issue_comment') {
    const issue = payload.issue || {};
    return {
      id: `github:${eventName}:${issue.number || ''}:${payload.action || 'updated'}:${issue.updated_at || ''}`,
      type: `github.${eventName}`,
      signal: 'yellow',
      headline: `Issue #${issue.number || ''} ${payload.action || 'updated'}`,
      summary: issue.title || 'GitHub Issue feedback',
      url: issue.html_url || null,
      subject: { kind: 'issue', id: String(issue.number || ''), branch: null, sha: null }
    };
  }
  return null;
}

class DeliveryEventStore {
  constructor({ maxEvents = 250, now = () => new Date() } = {}) {
    this.maxEvents = maxEvents;
    this.now = now;
    this.events = [];
    this.eventIds = new Set();
    this.listeners = new Set();
  }

  publish(input) {
    if (!input?.id || this.eventIds.has(input.id)) return { duplicate: true, event: null };
    const event = {
      id: input.id,
      type: input.type,
      signal: ['green', 'yellow', 'red'].includes(input.signal) ? input.signal : 'yellow',
      headline: String(input.headline || 'Delivery update').slice(0, 180),
      summary: String(input.summary || '').slice(0, 1000),
      url: input.url || null,
      subject: input.subject || { kind: 'delivery', id: '', branch: null, sha: null },
      source: input.source || 'system',
      occurredAt: input.occurredAt || this.now().toISOString()
    };
    this.eventIds.add(event.id);
    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      const discarded = this.events.pop();
      this.eventIds.delete(discarded.id);
    }
    for (const listener of this.listeners) listener(event);
    return { duplicate: false, event };
  }

  snapshot() {
    const events = [...this.events];
    return {
      generatedAt: this.now().toISOString(),
      counts: ['green', 'yellow', 'red'].reduce((counts, signal) => {
        counts[signal] = events.filter((event) => event.signal === signal).length;
        return counts;
      }, {}),
      events
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

module.exports = { DeliveryEventStore, classifyGitHubEvent, verifyGitHubSignature, safeEqual };
