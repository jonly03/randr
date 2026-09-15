const crypto = require('node:crypto');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const SwaggerParser = require('@apidevtools/swagger-parser');
const YAML = require('yaml');
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
  const response = await request(app).get('/').expect(200, /id="root"/);
  assert.match(response.headers['content-security-policy'], /default-src 'self'/);
  await request(app).get('/client.js').expect(200, /renderGlass/);
  await request(app).get('/server/app.js').expect(404);
});

test('OpenAPI 3.1 contract parses and validates', async () => {
  const openApiPath = path.join(__dirname, '..', 'server', 'openapi.yaml');
  const document = await SwaggerParser.validate(openApiPath);
  assert.equal(document.openapi, '3.1.0');
  assert.equal(document.info.title, 'R&R Finest Auto Glass API');
});

test('OpenAPI contract covers every implemented OAuth and versioned API route', async () => {
  const openApiPath = path.join(__dirname, '..', 'server', 'openapi.yaml');
  const document = YAML.parse(require('node:fs').readFileSync(openApiPath, 'utf8'));
  const documentedOperations = Object.entries(document.paths).flatMap(([routePath, pathItem]) =>
    Object.keys(pathItem)
      .filter((method) => ['get', 'post', 'put', 'patch', 'delete'].includes(method))
      .map((method) => `${method.toUpperCase()} ${routePath}`)
  );
  const implementedOperations = [
    'GET /api/docs',
    'GET /api/openapi.yaml',
    'GET /oauth/authorize',
    'POST /oauth/token',
    'GET /api/v1/catalog/years',
    'GET /api/v1/catalog/makes',
    'GET /api/v1/catalog/models',
    'POST /api/v1/lookups/vin'
  ];
  assert.deepEqual(documentedOperations.sort(), implementedOperations.sort());
});

test('Swagger UI and the raw OpenAPI contract are public in development', async () => {
  const app = createApp({ config });
  const docs = await request(app).get('/api/docs/').expect(200, /id="swagger-ui"/);
  assert.match(docs.headers['content-security-policy'], /frame-ancestors 'none'/);
  const initScript = await request(app).get('/api/docs/swagger-ui-init.js').expect(200);
  assert.match(initScript.text, /usePkceWithAuthorizationCodeGrant/);
  assert.match(initScript.text, /http:\/\/localhost:3000\/api\/docs\/oauth2-redirect\.html/);
  await request(app).get('/api/docs/oauth2-redirect.html').expect(200);
  const contract = await request(app).get('/api/openapi.yaml').expect(200);
  assert.match(contract.headers['content-type'], /application\/yaml/);
  assert.match(contract.text, /openapi: 3\.1\.0/);
  const docsCallback = 'http://localhost:3000/api/docs/oauth2-redirect.html';
  assert.ok(config.oauth.redirectUris.includes(docsCallback));
  const verifier = 'swagger-verifier-that-is-long-enough-for-pkce-123456789';
  const authorization = await request(app).get('/oauth/authorize').query({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: docsCallback,
    state: 'swagger-state-value-1234',
    code_challenge: challenge(verifier),
    code_challenge_method: 'S256'
  }).expect(302);
  assert.equal(new URL(authorization.headers.location).origin + new URL(authorization.headers.location).pathname,
    docsCallback);
});

test('protected operations declare OAuth scope while OAuth and documentation operations are public', () => {
  const openApiPath = path.join(__dirname, '..', 'server', 'openapi.yaml');
  const document = YAML.parse(require('node:fs').readFileSync(openApiPath, 'utf8'));
  for (const [routePath, pathItem] of Object.entries(document.paths)) {
    for (const operation of Object.values(pathItem)) {
      if (!operation || typeof operation !== 'object' || !operation.responses) continue;
      if (routePath.startsWith('/api/v1/')) {
        assert.deepEqual(operation.security, [{ oauth2: ['lookup:read'] }]);
        assert.ok(operation.responses['401']);
      } else if (routePath.startsWith('/oauth/') || routePath === '/api/docs'
        || routePath === '/api/openapi.yaml') {
        assert.deepEqual(operation.security, []);
      }
    }
  }
  assert.equal(
    document.components.securitySchemes.oauth2.flows.authorizationCode.authorizationUrl,
    '/oauth/authorize'
  );
});

test('API documentation can be disabled or access-key restricted in production', async () => {
  const disabledConfig = createConfig({ NODE_ENV: 'production', PORT: '3000' });
  const disabledApp = createApp({ config: disabledConfig });
  await request(disabledApp).get('/api/docs/').expect(404);
  await request(disabledApp).get('/api/openapi.yaml').expect(404);

  const restrictedConfig = createConfig({
    NODE_ENV: 'production',
    API_DOCS_ENABLED: 'true',
    API_DOCS_ACCESS_KEY: 'docs-test-key',
    PORT: '3000'
  });
  const restrictedApp = createApp({ config: restrictedConfig });
  await request(restrictedApp).get('/api/openapi.yaml').expect(401, /docs_access_denied/);
  await request(restrictedApp).get('/api/openapi.yaml')
    .set('X-API-Docs-Key', 'docs-test-key')
    .expect(200, /openapi: 3\.1\.0/);
});
