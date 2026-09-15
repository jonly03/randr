const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { DeliveryEventStore, classifyGitHubEvent, verifyGitHubSignature } = require('../server/delivery-events');
const { createApp } = require('../server/app');
const { createConfig } = require('../server/config');

test('delivery event store is idempotent, bounded, and keeps the attention count honest', () => {
  const store = new DeliveryEventStore({ maxEvents: 2, now: () => new Date('2026-09-15T12:00:00.000Z') });
  assert.equal(store.publish({ id: 'one', type: 'test', signal: 'green', headline: 'one' }).duplicate, false);
  assert.equal(store.publish({ id: 'one', type: 'test', signal: 'red', headline: 'changed duplicate' }).duplicate, true);
  store.publish({ id: 'two', type: 'test', signal: 'yellow', headline: 'two' });
  store.publish({ id: 'three', type: 'test', signal: 'red', headline: 'three' });
  const snapshot = store.snapshot();
  assert.deepEqual(snapshot.events.map((event) => event.id), ['three', 'two']);
  assert.deepEqual(snapshot.counts, { green: 0, yellow: 1, red: 1 });
});

test('GitHub workflow failures and cancellations become red attention events', () => {
  for (const conclusion of ['failure', 'cancelled']) {
    const event = classifyGitHubEvent('workflow_run', { workflow_run: { id: 99, run_attempt: 1, name: 'Test', conclusion, display_title: 'RR-026', html_url: 'https://example.test/run', head_branch: 'dev', head_sha: 'abc' } });
    assert.equal(event.signal, 'red');
    assert.match(event.headline, new RegExp(conclusion));
  }
});

test('webhook signature verification rejects altered payloads and accepts only the correct HMAC', () => {
  const body = Buffer.from('{"ok":true}');
  const secret = 'test-secret';
  const signature = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  assert.equal(verifyGitHubSignature(body, signature, secret), true);
  assert.equal(verifyGitHubSignature(Buffer.from('{"ok":false}'), signature, secret), false);
  assert.equal(verifyGitHubSignature(body, signature, 'wrong-secret'), false);
});

function deliveryApp() {
  const config = createConfig({
    PORT: '3000', OAUTH_CLIENT_ID: 'rr-browser-client', OAUTH_REDIRECT_URIS: 'http://localhost:3000/oauth/callback', CORS_ORIGINS: 'http://localhost:3000',
    GITHUB_WEBHOOK_SECRET: 'webhook-secret', DELIVERY_AGENT_EVENT_KEY: 'agent-key'
  });
  return createApp({ config, deliveryEvents: new DeliveryEventStore({ now: () => new Date('2026-09-15T12:00:00.000Z') }) });
}

test('delivery API accepts only authenticated specialist events and returns a consistent snapshot', async () => {
  const app = deliveryApp();
  await request(app).post('/api/delivery/events').send({ id: 'event-1', type: 'agent.feedback', headline: 'Missing expected result' }).expect(401);
  await request(app).post('/api/delivery/events').set('x-delivery-agent-key', 'agent-key').send({ id: 'event-1', type: 'agent.feedback', signal: 'yellow', headline: 'Missing expected result', subject: { kind: 'issue', id: '26' } }).expect(201);
  const snapshot = await request(app).get('/api/delivery/snapshot').expect(200);
  assert.equal(snapshot.body.counts.yellow, 1);
  assert.equal(snapshot.body.events[0].subject.id, '26');
});

test('GitHub webhook is authenticated and duplicate deliveries do not duplicate the dashboard state', async () => {
  const app = deliveryApp();
  const payload = JSON.stringify({ workflow_run: { id: 26, run_attempt: 1, name: 'Test', conclusion: 'failure', display_title: 'RR-026 test', head_branch: 'dev', head_sha: 'abc', html_url: 'https://example.test/run' } });
  const signature = `sha256=${crypto.createHmac('sha256', 'webhook-secret').update(payload).digest('hex')}`;
  await request(app).post('/api/delivery/webhooks/github').set('x-github-event', 'workflow_run').set('x-hub-signature-256', 'sha256=bad').set('Content-Type', 'application/json').send(payload).expect(401);
  await request(app).post('/api/delivery/webhooks/github').set('x-github-event', 'workflow_run').set('x-hub-signature-256', signature).set('Content-Type', 'application/json').send(payload).expect(202);
  await request(app).post('/api/delivery/webhooks/github').set('x-github-event', 'workflow_run').set('x-hub-signature-256', signature).set('Content-Type', 'application/json').send(payload).expect(200);
  const snapshot = await request(app).get('/api/delivery/snapshot').expect(200);
  assert.equal(snapshot.body.events.length, 1);
  assert.equal(snapshot.body.events[0].signal, 'red');
});

test('control surface and SSE stream are available without exposing delivery secrets', async () => {
  const app = deliveryApp();
  await request(app).get('/control.html').expect(200, /Live delivery control/);
  const response = await request(app).get('/api/delivery/stream').buffer(true).parse((res, callback) => {
    let body = '';
    res.on('data', (chunk) => { body += chunk; if (body.includes('event: snapshot')) res.destroy(); });
    res.on('close', () => callback(null, body));
  });
  assert.match(response.body, /event: snapshot/);
  assert.doesNotMatch(response.body, /webhook-secret|agent-key/);
});
