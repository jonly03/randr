# RR-007: Frontend/API integration

## Status

Done

## Desired outcome

The client workflow obtains a demo OAuth access token with Authorization Code and PKCE, then uses the protected Express catalog and VIN endpoints instead of reading the mock JSON file directly.

## Ownership

| Role | Accountable for |
|---|---|
| Product Manager | User-visible authorization and recovery experience |
| Engineering Manager | Delivery quality, tests, and operational readiness |
| Lead System Architect | Same-origin boundary, API contract, and integration decisions |
| Front-end Engineer | OAuth client, API adapter, and workflow state |
| Security Engineer | PKCE state handling, token lifecycle, and browser-storage review |

## Proposed scope

- Add a browser OAuth PKCE client for the current demo authorization server.
- Add an API adapter for catalog and VIN lookup operations.
- Replace direct `mock-server/lookup-data.json` reads in the operational path.
- Preserve an explicitly labeled static demonstration mode for GitHub Pages.
- Handle authorization callback, cancellation, expiration, API failure, and reauthorization.
- Keep access tokens in memory and store only the minimum short-lived PKCE transaction state required across the redirect.
- Add automated integration tests proving the frontend targets `/api/v1` endpoints.

## Acceptance criteria

- The Express-served frontend completes Authorization Code with PKCE `S256` without a client secret.
- OAuth `state` is generated before redirect and verified after callback.
- The access token is not persisted in local storage.
- Year, Make, Model, and VIN operations use the protected API.
- Door Glass retains the required Year → Make → Model → VIN sequence.
- Windshield and Back Glass begin with VIN.
- Expired or invalid tokens trigger a clear reauthorization path.
- Direct mock JSON access is not used by the Express-served operational flow.
- GitHub Pages remains usable in a visibly labeled static-demo mode.
- Automated tests and manual network inspection demonstrate frontend-to-backend communication.

## Out of scope

- React migration
- Docker configuration
- Render deployment
- MyGrant or Playwright implementation
- Production identity-provider integration

## Risks to review before execution

- The current demo authorization endpoint does not authenticate a person.
- Redirect-driven authorization can discard unsaved workflow state unless it is deliberately restored.
- Supporting both Express and GitHub Pages must not silently downgrade an operational session to public mock data.

## Evidence

- Twenty-four automated tests passed.
- Front-end Engineering implementation completed and Security Engineering accepted the remediation review.
- OAuth callback parameters are removed from browser history before validation or token exchange on every success and failure path.
- A live same-origin smoke test completed authorization, state round-trip, token exchange, and an authenticated catalog request.
- The operational mock JSON route returned `404`, proving that operational lookup data is available only through the protected API.
