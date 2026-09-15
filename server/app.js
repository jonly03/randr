const path = require('node:path');
const fs = require('node:fs');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const { createConfig } = require('./config');
const { OAuthStore } = require('./oauth-store');
const { MockLookupProvider } = require('./providers/mock-lookup-provider');
const { DeliveryEventStore, classifyGitHubEvent, safeEqual, verifyGitHubSignature } = require('./delivery-events');

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
  const deliveryEvents = options.deliveryEvents || new DeliveryEventStore({ maxEvents: config.delivery.maxEvents });
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", 'data:'],
        scriptSrc: ["'self'", 'https://cdn.jsdelivr.net'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://cdn.jsdelivr.net', 'https://fonts.googleapis.com']
      }
    }
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed by CORS'));
    },
    credentials: false,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type']
  }));
  // Webhooks need their exact bytes for HMAC verification. This route deliberately
  // runs before JSON parsing and never exposes the configured secret to a browser.
  app.post('/api/delivery/webhooks/github', express.raw({ type: 'application/json', limit: '256kb' }), (req, res) => {
    if (!config.delivery.githubWebhookSecret) return res.status(503).json({ error: 'webhook_not_configured' });
    const signature = req.get('x-hub-signature-256');
    if (!verifyGitHubSignature(req.body, signature, config.delivery.githubWebhookSecret)) {
      return res.status(401).json({ error: 'invalid_webhook_signature' });
    }
    let payload;
    try { payload = JSON.parse(req.body.toString('utf8')); } catch (_error) { return res.status(400).json({ error: 'invalid_webhook_payload' }); }
    const event = classifyGitHubEvent(req.get('x-github-event'), payload);
    if (!event) return res.status(202).json({ accepted: true, ignored: true });
    const result = deliveryEvents.publish({ ...event, source: 'github', occurredAt: payload.workflow_run?.updated_at || payload.pull_request?.updated_at || payload.issue?.updated_at });
    return res.status(result.duplicate ? 200 : 202).json({ accepted: true, duplicate: result.duplicate });
  });
  app.use(express.json({ limit: '16kb' }));
  app.use(express.urlencoded({ extended: false, limit: '16kb' }));

  const deliveryReadLimiter = rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-8', legacyHeaders: false });
  const deliveryWriteLimiter = rateLimit({ windowMs: 60_000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false });
  const requireDeliveryAgent = (req, res, next) => {
    const key = req.get('x-delivery-agent-key') || '';
    if (!config.delivery.agentEventKey || !safeEqual(key, config.delivery.agentEventKey)) return res.status(401).json({ error: 'delivery_agent_unauthorized' });
    return next();
  };
  app.get('/api/delivery/snapshot', deliveryReadLimiter, (_req, res) => res.set('Cache-Control', 'no-store').json(deliveryEvents.snapshot()));
  app.get('/api/delivery/stream', deliveryReadLimiter, (req, res) => {
    res.status(200).set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' });
    res.flushHeaders();
    const send = (name, payload) => res.write(`event: ${name}\ndata: ${JSON.stringify(payload)}\n\n`);
    send('snapshot', deliveryEvents.snapshot());
    const unsubscribe = deliveryEvents.subscribe((event) => send('delivery-event', event));
    const heartbeat = setInterval(() => res.write(': heartbeat\n\n'), 25_000);
    req.on('close', () => { clearInterval(heartbeat); unsubscribe(); });
  });
  app.post('/api/delivery/events', deliveryWriteLimiter, requireDeliveryAgent, (req, res) => {
    const { id, type, signal, headline, summary, url, subject, source, occurredAt } = req.body || {};
    if (![id, type, headline].every((value) => typeof value === 'string' && value.length > 0)) return res.status(400).json({ error: 'invalid_delivery_event' });
    const result = deliveryEvents.publish({ id, type, signal, headline, summary, url, subject, source: source || 'specialist', occurredAt });
    return res.status(result.duplicate ? 200 : 201).json({ duplicate: result.duplicate, event: result.event });
  });

  if (config.docs.enabled) {
    const openApiPath = path.join(__dirname, 'openapi.yaml');
    const openApiDocument = YAML.parse(fs.readFileSync(openApiPath, 'utf8'));
    const setDocsSecurityHeaders = (_req, res, next) => {
      res.set('Content-Security-Policy', [
        "default-src 'self'",
        "base-uri 'self'",
        "connect-src 'self'",
        "font-src 'self' data:",
        "form-action 'self'",
        "frame-ancestors 'none'",
        "img-src 'self' data:",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline'"
      ].join('; '));
      return next();
    };
    const requireDocsAccess = (req, res, next) => {
      if (!config.docs.accessKey || req.get('x-api-docs-key') === config.docs.accessKey) return next();
      return res.status(401).json({
        error: 'docs_access_denied',
        message: 'A valid X-API-Docs-Key header is required'
      });
    };

    app.get('/api/openapi.yaml', requireDocsAccess, (_req, res) => {
      res.set('Cache-Control', 'no-store');
      return res.type('application/yaml').sendFile(openApiPath);
    });
    app.use('/api/docs', requireDocsAccess, setDocsSecurityHeaders, swaggerUi.serve, swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'R&R Finest Auto Glass API',
      swaggerOptions: {
        oauth2RedirectUrl: config.docs.oauthCallbackUrl,
        persistAuthorization: false,
        tryItOutEnabled: true,
        oauth: {
          clientId: config.oauth.clientId,
          scopes: config.oauth.scope,
          usePkceWithAuthorizationCodeGrant: true
        }
      }
    }));
  }

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
  const sendOperationalClient = (_req, res, next) => {
    fs.readFile(path.join(publicRoot, 'index.html'), 'utf8', (error, document) => {
      if (error) return next(error);
      const clientId = config.oauth.clientId.replace(/[^A-Za-z0-9._~-]/g, '');
      const operationalDocument = document
        .replace('<base href="./">', '<base href="/">')
        .replace('data-runtime-mode="static-demo"', 'data-runtime-mode="operational"')
        .replace('data-oauth-client-id="rr-client"', `data-oauth-client-id="${clientId}"`);
      res.set('Cache-Control', 'no-store');
      return res.type('html').send(operationalDocument);
    });
  };
  app.get(['/', '/index.html', '/oauth/callback'], sendOperationalClient);
  for (const fileName of ['client.css', 'client.js', 'oauth-client.js', 'api-client.js', 'board.html', 'board.css', 'board.js', 'blueprint.html', 'control.html', 'control.css', 'control.js', 'whats-new.html', 'whats-new.css', 'whats-new.js']) {
    app.get(`/${fileName}`, sendPublicFile(fileName));
  }
  // Project JSON remains available to the read-only delivery board. Operational
  // client lookup data is available only through authenticated /api/v1 routes.
  app.use('/project', express.static(path.join(publicRoot, 'project'), { index: false, dotfiles: 'deny' }));
  app.use((error, _req, res, _next) => {
    if (error.message === 'Origin not allowed by CORS') return res.status(403).json({ error: 'cors_rejected' });
    return res.status(500).json({ error: 'internal_server_error' });
  });

  return app;
}

module.exports = { createApp };
