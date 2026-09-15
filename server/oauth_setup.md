# Demo OAuth setup

## Purpose

This server exercises the intended authentication boundary before the MyGrant provider is implemented. It uses OAuth 2.0 Authorization Code with PKCE (`S256`) and protects every `/api/v1` endpoint with a short-lived bearer token.

This is a development scaffold, not a production identity provider. The authorization endpoint auto-approves a registered demo client and does not authenticate a person.

## Run locally

1. Install Node.js 20 or newer.
2. Copy `.env.example` to `.env` and keep `.env` out of source control.
3. Run `npm install`.
4. Run `npm test`.
5. Run `npm start`.
6. Open `http://localhost:3000`.

## Configuration

| Variable | Purpose | Development default |
|---|---|---|
| `PORT` | Express port | `3000` |
| `OAUTH_CLIENT_ID` | Registered public-client identifier | `rr-client` |
| `OAUTH_REDIRECT_URIS` | Comma-separated exact callback allowlist | `http://localhost:3000/oauth/callback` |
| `CORS_ORIGINS` | Comma-separated browser-origin allowlist | `http://localhost:3000` |
| `ACCESS_TOKEN_TTL_SECONDS` | Access-token lifetime | `300` |
| `AUTH_CODE_TTL_SECONDS` | Authorization-code lifetime | `60` |
| `OAUTH_MAX_ENTRIES` | Maximum in-memory codes or tokens | `1000` |

## OAuth flow

1. The public client creates a high-entropy `code_verifier` containing 43–128 RFC 7636 characters.
2. It computes `BASE64URL(SHA256(code_verifier))` as the `code_challenge`.
3. It sends the user to `/oauth/authorize` with the registered client, exact redirect URI, an unpredictable `state`, the challenge, and `code_challenge_method=S256`.
4. The server redirects to the registered URI with a short-lived, single-use authorization code and the original state.
5. The client verifies `state` and exchanges the code plus verifier at `/oauth/token` using form encoding.
6. The client sends the returned token as `Authorization: Bearer <token>`.

## Protected endpoints

| Method | Endpoint | Input |
|---|---|---|
| `GET` | `/api/v1/catalog/years` | None |
| `GET` | `/api/v1/catalog/makes` | Query: `year` |
| `GET` | `/api/v1/catalog/models` | Query: `year`, `make` |
| `POST` | `/api/v1/lookups/vin` | JSON: `vin`, `glassType`; Door Glass also requires `year`, `make`, `model` |

The API requires the `lookup:read` scope. The current mock provider reads `mock-server/lookup-data.json`; a later Playwright provider will implement the same contract.

## Known development constraints

- Codes, tokens, and rate-limit counters are in memory and disappear on restart.
- The server supports one process and one instance only.
- There is no user login, consent, MFA, OIDC identity, refresh token, durable revocation, or key rotation.
- The public GitHub Pages prototype still reads public mock JSON directly; it is not yet connected to this protected API.
- Do not use customer data, MyGrant credentials, or production traffic with this authorization scaffold.

