const crypto = require('node:crypto');

const randomValue = () => crypto.randomBytes(32).toString('base64url');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('base64url');
const safeEqual = (left, right) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};
const isValidVerifier = (value) => typeof value === 'string'
  && value.length >= 43
  && value.length <= 128
  && /^[A-Za-z0-9._~-]+$/.test(value);

class OAuthStore {
  constructor(config, now = () => Date.now()) {
    this.config = config;
    this.now = now;
    this.codes = new Map();
    this.tokens = new Map();
  }

  prune() {
    const currentTime = this.now();
    for (const [code, grant] of this.codes) if (grant.expiresAt <= currentTime) this.codes.delete(code);
    for (const [token, grant] of this.tokens) if (grant.expiresAt <= currentTime) this.tokens.delete(token);
    while (this.codes.size >= this.config.maxEntries) this.codes.delete(this.codes.keys().next().value);
    while (this.tokens.size >= this.config.maxEntries) this.tokens.delete(this.tokens.keys().next().value);
  }

  issueCode({ clientId, redirectUri, codeChallenge }) {
    this.prune();
    const code = randomValue();
    this.codes.set(code, {
      clientId,
      redirectUri,
      codeChallenge,
      expiresAt: this.now() + this.config.authorizationCodeTtlSeconds * 1000
    });
    return code;
  }

  exchangeCode({ code, clientId, redirectUri, codeVerifier }) {
    const grant = this.codes.get(code);
    // Consume before validation so a code can never be replayed or brute-forced.
    this.codes.delete(code);
    if (!grant || grant.expiresAt <= this.now()) {
      return null;
    }
    if (!isValidVerifier(codeVerifier) || grant.clientId !== clientId || grant.redirectUri !== redirectUri
      || !safeEqual(sha256(codeVerifier), grant.codeChallenge)) {
      return null;
    }

    this.prune();
    const accessToken = randomValue();
    this.tokens.set(accessToken, {
      clientId,
      scope: this.config.scope,
      expiresAt: this.now() + this.config.accessTokenTtlSeconds * 1000
    });
    return accessToken;
  }

  validateToken(accessToken) {
    const token = this.tokens.get(accessToken);
    if (!token || token.expiresAt <= this.now()) {
      this.tokens.delete(accessToken);
      return null;
    }
    return token;
  }
}

module.exports = { OAuthStore };
