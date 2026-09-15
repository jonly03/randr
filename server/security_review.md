# Security review

## Decision

Approved as a demo-only authentication boundary. It is not approved as a production authorization or identity service.

## Implemented controls

- Exact client and redirect-URI allowlists
- Mandatory PKCE `S256`
- RFC 7636 verifier validation and timing-safe challenge comparison
- Cryptographically random, single-use authorization codes
- Sixty-second authorization-code lifetime
- Five-minute opaque bearer-token lifetime
- `lookup:read` scope enforcement on all `/api/v1` routes
- `Cache-Control: no-store` and `Pragma: no-cache` on token responses
- Restricted CORS origins, methods, and headers
- Separate authorization, token, and API rate limits
- Helmet security headers and disabled Express signature
- Bounded request bodies and allowlisted lookup fields
- VIN, glass-type, year, make, and model validation
- Bounded in-memory code and token stores with expired-entry cleanup
- No committed credentials and no secret-bearing request logging

## Explicit demo risks

- The authorization endpoint auto-approves a public client without authenticating a user.
- Authorization codes and access tokens are stored only in process memory.
- Restarting the server invalidates all authorization state.
- Multi-instance deployment, high availability, durable revocation, MFA, OIDC identity, account recovery, and security monitoring are unsupported.
- The mock dataset is public and must not be treated as protected customer information.

## Production gates

- Replace the in-process authorization server with a maintained OIDC provider such as Auth0, Amazon Cognito, or Microsoft Entra ID.
- Validate issuer, audience, expiry, scopes, discovery metadata, and rotating signing keys.
- Require TLS, managed secrets, MFA, revocation, audit trails, dependency scanning, secret scanning, and incident procedures.
- Classify VIN and customer data; define retention, deletion, encryption, and access policies.
- Obtain written confirmation that the MyGrant agreement permits automation and define approved service-account, MFA, concurrency, and rate-limit behavior.
- Isolate the Playwright worker, restrict outbound network access, and add timeouts, retry limits, circuit breaking, and vendor-layout-change detection.
- Complete a new threat model and security test before accepting real customer or vendor credentials.

