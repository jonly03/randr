const parseList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

const parseBoolean = (value, fallback) => {
  if (value === undefined) return fallback;
  return value.toLowerCase() === 'true';
};

function createConfig(env = process.env) {
  const publicBaseUrl = (env.PUBLIC_BASE_URL || `http://localhost:${env.PORT || 3000}`).replace(/\/$/, '');
  const docsEnabled = parseBoolean(env.API_DOCS_ENABLED, env.NODE_ENV !== 'production');
  const docsOAuthCallbackUrl = env.API_DOCS_OAUTH_CALLBACK_URL
    || `${publicBaseUrl}/api/docs/oauth2-redirect.html`;
  const configuredRedirectUris = parseList(
    env.OAUTH_REDIRECT_URIS || `${publicBaseUrl}/oauth/callback`
  );
  const redirectUris = docsEnabled
    ? [...new Set([...configuredRedirectUris, docsOAuthCallbackUrl])]
    : configuredRedirectUris;

  return {
    port: Number(env.PORT || 3000),
    oauth: {
      clientId: env.OAUTH_CLIENT_ID || 'rr-client',
      redirectUris,
      accessTokenTtlSeconds: Number(env.ACCESS_TOKEN_TTL_SECONDS || 300),
      authorizationCodeTtlSeconds: Number(env.AUTH_CODE_TTL_SECONDS || 60),
      scope: 'lookup:read',
      maxEntries: Number(env.OAUTH_MAX_ENTRIES || 1000)
    },
    corsOrigins: parseList(env.CORS_ORIGINS || publicBaseUrl),
    docs: {
      enabled: docsEnabled,
      accessKey: env.API_DOCS_ACCESS_KEY || null,
      oauthCallbackUrl: docsOAuthCallbackUrl
    }
  };
}

module.exports = { createConfig };
