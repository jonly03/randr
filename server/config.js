const parseList = (value) => value.split(',').map((item) => item.trim()).filter(Boolean);

function createConfig(env = process.env) {
  return {
    port: Number(env.PORT || 3000),
    oauth: {
      clientId: env.OAUTH_CLIENT_ID || 'rr-client',
      redirectUris: parseList(env.OAUTH_REDIRECT_URIS || 'http://localhost:3000/oauth/callback'),
      accessTokenTtlSeconds: Number(env.ACCESS_TOKEN_TTL_SECONDS || 300),
      authorizationCodeTtlSeconds: Number(env.AUTH_CODE_TTL_SECONDS || 60),
      scope: 'lookup:read',
      maxEntries: Number(env.OAUTH_MAX_ENTRIES || 1000)
    },
    corsOrigins: parseList(env.CORS_ORIGINS || 'http://localhost:3000')
  };
}

module.exports = { createConfig };
