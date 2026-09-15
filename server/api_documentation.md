# API documentation

The server publishes an OpenAPI 3.1 contract and an interactive Swagger UI for the mock R&R API.

## Local access

Start the application:

```bash
npm install
npm start
```

Then open:

- Swagger UI: `http://localhost:3000/api/docs`
- OpenAPI YAML: `http://localhost:3000/api/openapi.yaml`

Swagger UI has **Try it out** enabled. Select **Authorize** to start the OAuth 2.0 Authorization Code flow. Swagger creates the PKCE verifier and S256 challenge, follows the local authorization flow, and applies the resulting bearer token to protected requests.

The development authorization server auto-approves the configured demo client. It does not authenticate a human user and must be replaced with a managed identity provider before production use.

## Configuration

| Environment variable | Default | Purpose |
|---|---|---|
| `PUBLIC_BASE_URL` | `http://localhost:$PORT` | Public origin used to construct callback URLs |
| `API_DOCS_ENABLED` | `true` outside production; `false` in production | Publishes or removes both documentation routes |
| `API_DOCS_ACCESS_KEY` | unset | If set, requires this value in `X-API-Docs-Key` for documentation requests |
| `API_DOCS_OAUTH_CALLBACK_URL` | `$PUBLIC_BASE_URL/api/docs/oauth2-redirect.html` | Swagger UI OAuth callback URL |
| `OAUTH_CLIENT_ID` | `rr-client` | Public OAuth client identifier used by Swagger UI |
| `OAUTH_REDIRECT_URIS` | `$PUBLIC_BASE_URL/oauth/callback` | Comma-separated client callbacks; the Swagger callback is registered automatically while docs are enabled |

For a public development instance, leave `API_DOCS_ACCESS_KEY` unset. For production, documentation is disabled by default. If production documentation is required, explicitly enable it and restrict access at the application or gateway layer:

```bash
NODE_ENV=production \
API_DOCS_ENABLED=true \
API_DOCS_ACCESS_KEY=replace-with-a-secret \
PUBLIC_BASE_URL=https://api.example.com \
npm start
```

When `API_DOCS_ACCESS_KEY` is configured, direct requests must include:

```text
X-API-Docs-Key: replace-with-a-secret
```

A production gateway can inject that header after authenticating an authorized operator. Disabling documentation is preferred when interactive production testing is unnecessary.

## Contract maintenance

`server/openapi.yaml` is the source of truth for the public HTTP contract. Any change to an OAuth or `/api/v1` route must update the contract in the same increment. Automated tests validate the document, compare it with the implemented route inventory, confirm OAuth declarations, and verify documentation access controls.
