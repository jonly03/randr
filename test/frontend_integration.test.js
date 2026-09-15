const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { BrowserOAuthClient, OAuthClientError, TRANSACTION_KEY } = require('../oauth-client');
const { LookupApiClient, ApiError, SessionExpiredError } = require('../api-client');
const { createApp } = require('../server/app');
const { createConfig } = require('../server/config');

function memoryStorage() {
  const entries = new Map();
  return {
    getItem: key => entries.has(key) ? entries.get(key) : null,
    setItem: (key, value) => entries.set(key, String(value)),
    removeItem: key => entries.delete(key)
  };
}

function browserHarness() {
  const storage = memoryStorage();
  const location = {
    origin: 'http://localhost:3000',
    href: 'http://localhost:3000/',
    assigned: null,
    assign(value) { this.assigned = value; }
  };
  const history = { replaced: null, replaceState(_state, _title, value) { this.replaced = value; } };
  return { storage, location, history };
}

test('browser OAuth client creates an S256 transaction without storing a token', async () => {
  const harness = browserHarness();
  const client = new BrowserOAuthClient({
    clientId: 'rr-test-client', redirectUri: 'http://localhost:3000/oauth/callback',
    storage: harness.storage, location: harness.location, history: harness.history,
    cryptoApi: crypto.webcrypto, now: () => 1000,
    fetchImpl: async () => { throw new Error('not called'); }
  });
  const workflow = { glassType: 'Door Glass', ymm: { year: '2021', make: 'Jeep', model: 'Wrangler Unlimited Sport' } };
  await client.startAuthorization(workflow);

  const destination = new URL(harness.location.assigned);
  const transaction = JSON.parse(harness.storage.getItem(TRANSACTION_KEY));
  assert.equal(destination.pathname, '/oauth/authorize');
  assert.equal(destination.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(destination.searchParams.get('state'), transaction.state);
  assert.equal(destination.searchParams.get('code_challenge').length, 43);
  assert.deepEqual(transaction.workflow, workflow);
  assert.equal(harness.storage.getItem('access_token'), null);
});

test('browser OAuth callback verifies state, restores workflow, and keeps token memory-only', async () => {
  const harness = browserHarness();
  harness.storage.setItem(TRANSACTION_KEY, JSON.stringify({
    state: 'matching-state-value', verifier: 'valid-verifier-value-that-is-at-least-forty-three-characters', createdAt: 1000,
    workflow: { glassType: 'Windshield' }
  }));
  harness.location.href = 'http://localhost:3000/oauth/callback?code=one-time-code&state=matching-state-value';
  let exchange;
  const client = new BrowserOAuthClient({
    clientId: 'rr-test-client', redirectUri: 'http://localhost:3000/oauth/callback',
    storage: harness.storage, location: harness.location, history: harness.history,
    cryptoApi: crypto.webcrypto, now: () => 2000,
    fetchImpl: async (url, options) => {
      exchange = { url, options };
      return { ok: true, json: async () => ({ access_token: 'memory-token', expires_in: 300 }) };
    }
  });
  const result = await client.handleCallback();

  assert.deepEqual(result.workflow, { glassType: 'Windshield' });
  assert.equal(exchange.url, '/oauth/token');
  assert.match(exchange.options.body.toString(), /code_verifier=valid-verifier-value-that-is-at-least-forty-three-characters/);
  assert.equal(client.getAccessToken(), 'memory-token');
  assert.equal(harness.storage.getItem(TRANSACTION_KEY), null);
  assert.equal(harness.storage.getItem('access_token'), null);
  assert.equal(harness.history.replaced, '/');
});

test('browser OAuth callback rejects mismatched state and consumes the transaction', async () => {
  const harness = browserHarness();
  harness.storage.setItem(TRANSACTION_KEY, JSON.stringify({ state: 'expected', verifier: 'verifier', createdAt: 1000 }));
  harness.location.href = 'http://localhost:3000/oauth/callback?code=code&state=attacker';
  const client = new BrowserOAuthClient({
    storage: harness.storage, location: harness.location, history: harness.history,
    cryptoApi: crypto.webcrypto, now: () => 2000, fetchImpl: async () => { throw new Error('must not exchange'); }
  });
  await assert.rejects(() => client.handleCallback(), error => error instanceof OAuthClientError && error.code === 'state_mismatch');
  assert.equal(harness.storage.getItem(TRANSACTION_KEY), null);
  assert.equal(harness.history.replaced, '/');
});

test('browser OAuth callback scrubs query parameters before returning an OAuth error', async () => {
  const harness = browserHarness();
  harness.storage.setItem(TRANSACTION_KEY, JSON.stringify({
    state: 'matching-state', verifier: 'valid-verifier-value-that-is-at-least-forty-three-characters', createdAt: 1000
  }));
  harness.location.href = 'http://localhost:3000/oauth/callback?error=access_denied&error_description=Nope&state=matching-state';
  const client = new BrowserOAuthClient({
    storage: harness.storage, location: harness.location, history: harness.history,
    cryptoApi: crypto.webcrypto, now: () => 2000,
    fetchImpl: async () => { throw new Error('must not exchange'); }
  });
  await assert.rejects(() => client.handleCallback(), error => error instanceof OAuthClientError && error.code === 'access_denied');
  assert.equal(harness.history.replaced, '/');
  assert.equal(harness.storage.getItem(TRANSACTION_KEY), null);
});

test('browser OAuth callback scrubs query parameters before a token-exchange network failure', async () => {
  const harness = browserHarness();
  harness.storage.setItem(TRANSACTION_KEY, JSON.stringify({
    state: 'matching-state', verifier: 'valid-verifier-value-that-is-at-least-forty-three-characters', createdAt: 1000
  }));
  harness.location.href = 'http://localhost:3000/oauth/callback?code=sensitive-code&state=matching-state';
  let cleanBeforeFetch = false;
  const client = new BrowserOAuthClient({
    storage: harness.storage, location: harness.location, history: harness.history,
    cryptoApi: crypto.webcrypto, now: () => 2000,
    fetchImpl: async () => { cleanBeforeFetch = harness.history.replaced === '/'; throw new Error('network unavailable'); }
  });
  await assert.rejects(() => client.handleCallback(), /network unavailable/);
  assert.equal(cleanBeforeFetch, true);
  assert.equal(harness.history.replaced, '/');
  assert.equal(harness.storage.getItem(TRANSACTION_KEY), null);
});

test('browser OAuth callback rejects malformed verifier and materially future-dated transactions', async () => {
  for (const transaction of [
    { state: 'matching-state', verifier: 'too-short', createdAt: 1000 },
    { state: 'matching-state', verifier: 'valid-verifier-value-that-is-at-least-forty-three-characters', createdAt: 40_001 }
  ]) {
    const harness = browserHarness();
    harness.storage.setItem(TRANSACTION_KEY, JSON.stringify(transaction));
    harness.location.href = 'http://localhost:3000/oauth/callback?code=code&state=matching-state';
    let exchangeAttempted = false;
    const client = new BrowserOAuthClient({
      storage: harness.storage, location: harness.location, history: harness.history,
      cryptoApi: crypto.webcrypto, now: () => 2000,
      fetchImpl: async () => { exchangeAttempted = true; throw new Error('must not exchange'); }
    });
    await assert.rejects(() => client.handleCallback(), OAuthClientError);
    assert.equal(exchangeAttempted, false);
    assert.equal(harness.history.replaced, '/');
  }
});

test('API adapter sends bearer requests and distinguishes session expiry from API failures', async () => {
  const calls = [];
  const client = new LookupApiClient({
    tokenProvider: () => 'memory-token',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ years: ['2021'] }) };
    }
  });
  assert.deepEqual(await client.getYears(), ['2021']);
  assert.equal(calls[0].url, '/api/v1/catalog/years');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer memory-token');

  const expired = new LookupApiClient({ tokenProvider: () => { throw new Error('expired'); }, fetchImpl: async () => null });
  await assert.rejects(() => expired.getYears(), SessionExpiredError);

  const failed = new LookupApiClient({
    tokenProvider: () => 'token',
    fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ error: 'unavailable', message: 'Try later' }) })
  });
  await assert.rejects(() => failed.getYears(), error => error instanceof ApiError && error.status === 503 && error.message === 'Try later');
});

test('Express serves operational client and callback but does not expose public mock JSON', async () => {
  const config = createConfig({
    PORT: '3000', OAUTH_CLIENT_ID: 'rr-browser-client',
    OAUTH_REDIRECT_URIS: 'http://localhost:3000/oauth/callback', CORS_ORIGINS: 'http://localhost:3000'
  });
  const app = createApp({ config });
  const root = await request(app).get('/').expect(200);
  assert.match(root.text, /data-runtime-mode="operational"/);
  assert.match(root.text, /data-oauth-client-id="rr-browser-client"/);
  assert.doesNotMatch(root.text, /data-runtime-mode="static-demo"/);
  await request(app).get('/oauth/callback?code=test&state=test').expect(200, /data-runtime-mode="operational"/);
  await request(app).get('/oauth-client.js').expect(200, /BrowserOAuthClient/);
  await request(app).get('/api-client.js').expect(200, /LookupApiClient/);
  await request(app).get('/mock-server/lookup-data.json').expect(404);
});

test('repository index remains an explicitly labeled static-demo entry point', () => {
  const document = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'index.html'), 'utf8');
  const clientSource = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'client.js'), 'utf8');
  const apiSource = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'api-client.js'), 'utf8');
  assert.match(document, /data-runtime-mode="static-demo"/);
  assert.match(clientSource, /Static Demo · Public mock data/);
  assert.match(apiSource, /\/api\/v1\/lookups\/vin/);
});
