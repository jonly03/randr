(function exposeOAuthClient(globalScope) {
  const TRANSACTION_KEY = 'rr_oauth_transaction';
  const TRANSACTION_TTL_MS = 5 * 60 * 1000;
  const MAX_CLOCK_SKEW_MS = 30 * 1000;
  const VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;

  class OAuthClientError extends Error {
    constructor(code, message) {
      super(message);
      this.name = 'OAuthClientError';
      this.code = code;
    }
  }

  function base64Url(bytes) {
    let binary = '';
    for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  class BrowserOAuthClient {
    constructor(options = {}) {
      const browserWindow = typeof window === 'undefined' ? null : window;
      this.clientId = options.clientId || 'rr-client';
      this.location = options.location || browserWindow.location;
      this.redirectUri = options.redirectUri || `${this.location.origin}/oauth/callback`;
      this.storage = options.storage || browserWindow.sessionStorage;
      this.history = options.history || browserWindow.history;
      this.cryptoApi = options.cryptoApi || browserWindow.crypto;
      this.fetchImpl = options.fetchImpl || browserWindow.fetch.bind(browserWindow);
      this.now = options.now || (() => Date.now());
      this.accessToken = null;
      this.expiresAt = 0;
    }

    randomValue(byteLength) {
      const bytes = new Uint8Array(byteLength);
      this.cryptoApi.getRandomValues(bytes);
      return base64Url(bytes);
    }

    async startAuthorization(workflow = null) {
      const verifier = this.randomValue(64);
      const state = this.randomValue(32);
      const digest = await this.cryptoApi.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
      const transaction = { state, verifier, createdAt: this.now(), workflow };
      this.storage.setItem(TRANSACTION_KEY, JSON.stringify(transaction));

      const authorizeUrl = new URL('/oauth/authorize', this.location.origin);
      authorizeUrl.searchParams.set('response_type', 'code');
      authorizeUrl.searchParams.set('client_id', this.clientId);
      authorizeUrl.searchParams.set('redirect_uri', this.redirectUri);
      authorizeUrl.searchParams.set('scope', 'lookup:read');
      authorizeUrl.searchParams.set('state', state);
      authorizeUrl.searchParams.set('code_challenge', base64Url(digest));
      authorizeUrl.searchParams.set('code_challenge_method', 'S256');
      this.location.assign(authorizeUrl.toString());
    }

    async handleCallback() {
      const callbackUrl = new URL(this.location.href);
      const code = callbackUrl.searchParams.get('code');
      const oauthFailure = callbackUrl.searchParams.get('error');
      if (!code && !oauthFailure) return null;

      // Authorization codes, errors, and state must not remain in browser
      // history, logs, copied URLs, or referrer data while validation/exchange
      // is still in progress. This intentionally runs on every callback path.
      this.history.replaceState({}, '', '/');

      const rawTransaction = this.storage.getItem(TRANSACTION_KEY);
      this.storage.removeItem(TRANSACTION_KEY);
      if (!rawTransaction) throw new OAuthClientError('missing_transaction', 'The secure connection could not be verified. Please connect again.');

      let transaction;
      try { transaction = JSON.parse(rawTransaction); } catch (_error) {
        throw new OAuthClientError('invalid_transaction', 'The secure connection state was invalid. Please connect again.');
      }
      const returnedState = callbackUrl.searchParams.get('state');
      if (!transaction.state || returnedState !== transaction.state) {
        throw new OAuthClientError('state_mismatch', 'The authorization response did not match this browser session. Please connect again.');
      }
      const transactionAge = this.now() - transaction.createdAt;
      if (!Number.isFinite(transaction.createdAt) || transactionAge > TRANSACTION_TTL_MS
        || transactionAge < -MAX_CLOCK_SKEW_MS) {
        throw new OAuthClientError('transaction_expired', 'The authorization attempt expired. Please connect again.');
      }
      if (oauthFailure) {
        throw new OAuthClientError(oauthFailure, callbackUrl.searchParams.get('error_description') || 'Authorization was not completed.');
      }
      if (typeof transaction.verifier !== 'string' || !VERIFIER_PATTERN.test(transaction.verifier)) {
        throw new OAuthClientError('invalid_transaction', 'The secure connection state was invalid. Please connect again.');
      }

      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: this.clientId,
        redirect_uri: this.redirectUri,
        code_verifier: transaction.verifier
      });
      const response = await this.fetchImpl('/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.access_token) {
        throw new OAuthClientError(payload.error || 'token_exchange_failed', payload.error_description || 'Secure connection failed. Please try again.');
      }

      this.accessToken = payload.access_token;
      this.expiresAt = this.now() + (Number(payload.expires_in) * 1000);
      return { workflow: transaction.workflow || null };
    }

    getAccessToken() {
      if (!this.accessToken || this.now() >= this.expiresAt) {
        this.accessToken = null;
        this.expiresAt = 0;
        throw new OAuthClientError('session_expired', 'Your secure demo session expired. Connect again to continue.');
      }
      return this.accessToken;
    }

    isAuthenticated() {
      return Boolean(this.accessToken && this.now() < this.expiresAt);
    }
  }

  const exported = { BrowserOAuthClient, OAuthClientError, TRANSACTION_KEY, TRANSACTION_TTL_MS };
  globalScope.RROAuth = exported;
  if (typeof module !== 'undefined' && module.exports) module.exports = exported;
}(typeof globalThis !== 'undefined' ? globalThis : this));
