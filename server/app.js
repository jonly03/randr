const path = require('node:path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { createConfig } = require('./config');
const { OAuthStore } = require('./oauth-store');
const { MockLookupProvider } = require('./providers/mock-lookup-provider');

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;
const GLASS_TYPES = new Set(['Windshield', 'Back Glass', 'Door Glass']);
const YEAR_PATTERN = /^(19|20)\d{2}$/;
const TEXT_PATTERN = /^[A-Za-z0-9 .&'/-]{1,80}$/;

function oauthError(res, error, description, status = 400) {
  return res.status(status).json({ error, error_description: description });
}

function createApp(options = {}) {
  const config = options.config || createConfig();
  const store = options.store || new OAuthStore(config.oauth);
  const provider = options.provider || new MockLookupProvider(
    path.join(__dirname, '..', 'mock-server', 'lookup-data.json')
  );
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type']
  }));
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));

  const authorizeLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
  const tokenLimiter = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false });
  const apiLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false });

  app.get('/oauth/authorize', authorizeLimiter, (req, res) => {
    const { response_type: responseType, client_id: clientId, redirect_uri: redirectUri, state,
      code_challenge: codeChallenge, code_challenge_method: challengeMethod } = req.query;

    if (responseType !== 'code') return oauthError(res, 'unsupported_response_type', 'response_type must be code');
    if (clientId !== config.oauth.clientId) return oauthError(res, 'unauthorized_client', 'Unknown client_id', 401);
    if (!config.oauth.redirectUris.includes(redirectUri)) return oauthError(res, 'invalid_request', 'Unregistered redirect_uri');
    if (typeof state !== 'string' || state.length < 16 || state.length > 256) {
      return oauthError(res, 'invalid_request', 'state must contain 16 to 256 characters');
    }
    if (challengeMethod !== 'S256' || typeof codeChallenge !== 'string'
      || codeChallenge.length !== 43 || !/^[A-Za-z0-9_-]+$/.test(codeChallenge)) {
      return oauthError(res, 'invalid_request', 'A valid S256 code_challenge is required');
    }

    const code = store.issueCode({ clientId, redirectUri, codeChallenge });
    const destination = new URL(redirectUri);
    destination.searchParams.set('code', code);
    if (typeof state === 'string') destination.searchParams.set('state', state);
    return res.redirect(302, destination.toString());
  });

  app.post('/oauth/token', tokenLimiter, (req, res) => {
    if (!req.is('application/x-www-form-urlencoded')) return oauthError(res, 'invalid_request', 'Form encoding is required', 415);
    const { grant_type: grantType, code, client_id: clientId, redirect_uri: redirectUri,
      code_verifier: codeVerifier } = req.body;
    if (grantType !== 'authorization_code') return oauthError(res, 'unsupported_grant_type', 'grant_type must be authorization_code');
    if (![code, clientId, redirectUri, codeVerifier].every((value) => typeof value === 'string' && value.length > 0)) {
      return oauthError(res, 'invalid_request', 'code, client_id, redirect_uri, and code_verifier are required');
    }
    const accessToken = store.exchangeCode({ code, clientId, redirectUri, codeVerifier });
    if (!accessToken) return oauthError(res, 'invalid_grant', 'Authorization code or PKCE verifier is invalid');
    res.set('Cache-Control', 'no-store');
    res.set('Pragma', 'no-cache');
    return res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: config.oauth.accessTokenTtlSeconds, scope: config.oauth.scope });
  });

  function requireBearer(req, res, next) {
    const match = /^Bearer\s+([^\s]+)$/i.exec(req.get('authorization') || '');
    const token = match && store.validateToken(match[1]);
    if (!token || token.scope !== 'lookup:read') {
      res.set('WWW-Authenticate', 'Bearer realm="rr-api"');
      return oauthError(res, 'invalid_token', 'A valid bearer token is required', 401);
    }
    req.auth = token;
    return next();
  }

  app.use('/api/v1', apiLimiter, requireBearer);

  app.get('/api/v1/catalog/years', async (_req, res, next) => {
    try { return res.json({ years: await provider.getYears() }); } catch (error) { return next(error); }
  });
  app.get('/api/v1/catalog/makes', async (req, res, next) => {
    if (typeof req.query.year !== 'string' || !YEAR_PATTERN.test(req.query.year)) return res.status(400).json({ error: 'validation_error', message: 'year must be a four-digit year' });
    try { return res.json({ year: req.query.year, makes: await provider.getMakes(req.query.year) }); } catch (error) { return next(error); }
  });
  app.get('/api/v1/catalog/models', async (req, res, next) => {
    const { year, make } = req.query;
    if (typeof year !== 'string' || !YEAR_PATTERN.test(year) || typeof make !== 'string' || !TEXT_PATTERN.test(make)) {
      return res.status(400).json({ error: 'validation_error', message: 'a valid year and make are required' });
    }
    try { return res.json({ year, make, models: await provider.getModels(year, make) }); } catch (error) { return next(error); }
  });
  app.post('/api/v1/lookups/vin', async (req, res, next) => {
    if (!req.is('application/json')) return res.status(415).json({ error: 'unsupported_media_type', message: 'JSON is required' });
    const allowedFields = new Set(['vin', 'glassType', 'year', 'make', 'model']);
    if (Object.keys(req.body).some((field) => !allowedFields.has(field))) {
      return res.status(400).json({ error: 'validation_error', message: 'request contains an unexpected field' });
    }
    const vin = typeof req.body.vin === 'string' ? req.body.vin.trim().toUpperCase() : '';
    const glassType = req.body.glassType;
    if (!VIN_PATTERN.test(vin)) return res.status(400).json({ error: 'validation_error', message: 'vin must be a valid 17-character VIN' });
    if (!GLASS_TYPES.has(glassType)) return res.status(400).json({ error: 'validation_error', message: 'glassType must be Windshield, Back Glass, or Door Glass' });
    let vehicleContext = null;
    if (glassType === 'Door Glass') {
      const { year, make, model } = req.body;
      if (typeof year !== 'string' || !YEAR_PATTERN.test(year) || typeof make !== 'string'
        || !TEXT_PATTERN.test(make) || typeof model !== 'string' || !TEXT_PATTERN.test(model)) {
        return res.status(400).json({ error: 'validation_error', message: 'Door Glass requires a valid year, make, and model' });
      }
      vehicleContext = { year, make, model };
    }
    try {
      const result = await provider.lookupByVin(vin, glassType, vehicleContext);
      if (!result) return res.status(404).json({ error: 'not_found', message: 'No vehicle was found for that VIN' });
      return res.json(result);
    } catch (error) { return next(error); }
  });

  const publicRoot = path.join(__dirname, '..');
  const sendPublicFile = (fileName) => (_req, res) => res.sendFile(path.join(publicRoot, fileName));
  app.get(['/', '/index.html'], sendPublicFile('index.html'));
  for (const fileName of ['client.css', 'client.js', 'board.html', 'board.css', 'board.js', 'blueprint.html']) {
    app.get(`/${fileName}`, sendPublicFile(fileName));
  }
  // Temporary compatibility routes for the current static prototype and delivery board.
  app.use('/mock-server', express.static(path.join(publicRoot, 'mock-server'), { index: false, dotfiles: 'deny' }));
  app.use('/project', express.static(path.join(publicRoot, 'project'), { index: false, dotfiles: 'deny' }));
  app.use((error, _req, res, _next) => {
    if (error.message === 'Origin not allowed by CORS') return res.status(403).json({ error: 'cors_rejected' });
    return res.status(500).json({ error: 'internal_server_error' });
  });

  return app;
}

module.exports = { createApp };
