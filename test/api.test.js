const crypto = require('node:crypto');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createApp } = require('../server/app');
const { createConfig } = require('../server/config');

const clientId = 'rr-test-client';
const redirectUri = 'http://localhost:3000/oauth/callback';
const config = createConfig({
  PORT: '3000',
  OAUTH_CLIENT_ID: clientId,
  OAUTH_REDIRECT_URIS: redirectUri,
  CORS_ORIGINS: 'http://localhost:3000',
  ACCESS_TOKEN_TTL_SECONDS: '300',
  AUTH_CODE_TTL_SECONDS: '60'
});

function challenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

async function authorize(app, verifier = 'test-verifier-that-is-long-enough-for-pkce-123456789') {
  const response = await request(app).get('/oauth/authorize').query({
    response_type: 'code', client_id: clientId, redirect_uri: redirectUri,
    state: 'test-state-value-1234', code_challenge: challenge(verifier), code_challenge_method: 'S256'
  }).expect(302);
  const location = new URL(response.headers.location);
  assert.equal(location.searchParams.get('state'), 'test-state-value-1234');
  return { code: location.searchParams.get('code'), verifier };
}

async function tokenFor(app) {
  const { code, verifier } = await authorize(app);
  const response = await request(app).post('/oauth/token').type('form').send({
    grant_type: 'authorization_code', code, client_id: clientId,
    redirect_uri: redirectUri, code_verifier: verifier
  }).expect(200);
  return response.body.access_token;
}

test('OAuth authorization code + PKCE S256 issues a bearer token once', async () => {
  const app = createApp({ config });
  const { code, verifier } = await authorize(app);
  const payload = { grant_type: 'authorization_code', code, client_id: clientId, redirect_uri: redirectUri, code_verifier: verifier };
  const first = await request(app).post('/oauth/token').type('form').send(payload).expect(200);
  assert.equal(first.body.token_type, 'Bearer');
  assert.equal(first.body.expires_in, 300);
  await request(app).post('/oauth/token').type('form').send(payload).expect(400, /invalid_grant/);
});

test('OAuth rejects an incorrect PKCE verifier', async () => {
  const app = createApp({ config });
  const { code } = await authorize(app);
  await request(app).post('/oauth/token').type('form').send({
    grant_type: 'authorization_code', code, client_id: clientId,
    redirect_uri: redirectUri, code_verifier: 'incorrect-verifier'
  }).expect(400, /invalid_grant/);
});

test('protected API rejects missing and invalid bearer tokens', async () => {
  const app = createApp({ config });
  await request(app).get('/api/v1/catalog/years').expect(401, /invalid_token/);
  await request(app).get('/api/v1/catalog/years').set('Authorization', 'Bearer invalid').expect(401, /invalid_token/);
});

test('authorization endpoint rejects unregistered redirects and non-S256 requests', async () => {
  const app = createApp({ config });
  const verifier = 'test-verifier-that-is-long-enough-for-pkce-123456789';
  await request(app).get('/oauth/authorize').query({
    response_type: 'code', client_id: clientId, redirect_uri: 'https://attacker.example/callback',
    code_challenge: challenge(verifier), code_challenge_method: 'S256'
  }).expect(400, /Unregistered redirect_uri/);
  await request(app).get('/oauth/authorize').query({
    response_type: 'code', client_id: clientId, redirect_uri: redirectUri,
    state: 'test-state-value-1234', code_challenge: challenge(verifier), code_challenge_method: 'plain'
  }).expect(400, /S256/);
  await request(app).get('/oauth/authorize').query({
    response_type: 'code', client_id: clientId, redirect_uri: redirectUri,
    code_challenge: challenge(verifier), code_challenge_method: 'S256'
  }).expect(400, /state/);
});

test('catalog endpoints return mock year, make, and model data', async () => {
  const app = createApp({ config });
  const token = await tokenFor(app);
  const auth = { Authorization: `Bearer ${token}` };
  const years = await request(app).get('/api/v1/catalog/years').set(auth).expect(200);
  assert.deepEqual(years.body.years, ['2021', '2020', '2019']);
  const makes = await request(app).get('/api/v1/catalog/makes?year=2021').set(auth).expect(200);
  assert.deepEqual(makes.body.makes, ['Jeep', 'Toyota']);
  const models = await request(app).get('/api/v1/catalog/models?year=2021&make=Jeep').set(auth).expect(200);
  assert.ok(models.body.models.includes('Wrangler Unlimited Sport'));
});

test('VIN endpoint returns normalized glass lookup response', async () => {
  const app = createApp({ config });
  const token = await tokenFor(app);
  const response = await request(app).post('/api/v1/lookups/vin')
    .set('Authorization', `Bearer ${token}`)
    .send({ vin: '1c4hjxdg5mw625672', glassType: 'Windshield' })
    .expect(200);
  assert.equal(response.body.vin, '1C4HJXDG5MW625672');
  assert.equal(response.body.vehicle.make, 'Jeep');
  assert.equal(response.body.provider, 'mock');
  assert.equal(response.body.parts.length, 2);
});

test('VIN endpoint validates input and reports missing vehicles', async () => {
  const app = createApp({ config });
  const token = await tokenFor(app);
  const auth = { Authorization: `Bearer ${token}` };
  await request(app).post('/api/v1/lookups/vin').set(auth).send({ vin: 'bad', glassType: 'Windshield' }).expect(400);
  await request(app).post('/api/v1/lookups/vin').set(auth)
    .send({ vin: '1HGCM82633A004352', glassType: 'Windshield' }).expect(404);
});

test('Door Glass requires the Year, Make, and Model path before VIN lookup', async () => {
  const app = createApp({ config });
  const token = await tokenFor(app);
  const auth = { Authorization: `Bearer ${token}` };
  await request(app).post('/api/v1/lookups/vin').set(auth)
    .send({ vin: '1C4HJXDG5MW625672', glassType: 'Door Glass' }).expect(400, /year, make, and model/);
  const result = await request(app).post('/api/v1/lookups/vin').set(auth).send({
    vin: '1C4HJXDG5MW625672', glassType: 'Door Glass', year: '2021',
    make: 'Jeep', model: 'Wrangler Unlimited Sport'
  }).expect(200);
  assert.equal(result.body.parts.length, 2);
});

test('token responses prevent caching and invalid exchanges consume the code', async () => {
  const app = createApp({ config });
  const { code, verifier } = await authorize(app);
  const base = { grant_type: 'authorization_code', code, client_id: clientId, redirect_uri: redirectUri };
  await request(app).post('/oauth/token').type('form').send({ ...base, code_verifier: `${verifier}x` }).expect(400);
  await request(app).post('/oauth/token').type('form').send({ ...base, code_verifier: verifier }).expect(400);
  const next = await authorize(app);
  const response = await request(app).post('/oauth/token').type('form').send({
    grant_type: 'authorization_code', code: next.code, client_id: clientId,
    redirect_uri: redirectUri, code_verifier: next.verifier
  }).expect(200);
  assert.match(response.headers['cache-control'], /no-store/);
  assert.equal(response.headers.pragma, 'no-cache');
  assert.equal(response.body.scope, 'lookup:read');
});

test('server delivers the client UI without exposing backend source', async () => {
  const app = createApp({ config });
  await request(app).get('/').expect(200, /id="root"/);
  await request(app).get('/client.js').expect(200, /renderGlass/);
  await request(app).get('/server/app.js').expect(404);
});
