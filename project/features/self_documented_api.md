# RR-006: Self-documented API

## Status

Done

## Desired outcome

Developers and approved testers can discover the API contract, complete the demo OAuth PKCE flow, and exercise protected lookup endpoints from one browser interface.

## Ownership

| Role | Accountable for |
|---|---|
| Product Manager | Testing usability and acceptance |
| Engineering Manager | Implementation quality and verification |
| Lead System Architect | Contract boundaries and integration |
| API Platform Engineer | OpenAPI and Swagger implementation |
| Security Engineer | Authentication representation and exposure controls |

## Acceptance criteria

- The contract uses OpenAPI 3.1 and passes automated validation.
- Every OAuth, documentation, and versioned API route is represented.
- Every `/api/v1` operation declares OAuth with `lookup:read`.
- Swagger UI uses Authorization Code with PKCE `S256` and the exact registered callback.
- Door Glass requires Year, Make, and Model in its request schema.
- Swagger UI and the raw specification can be disabled together.
- Documentation is disabled by default in production.
- Existing authenticated API tests remain green.

## Evidence

- Fifteen automated tests passed.
- Route coverage, security declarations, callback registration, documentation loading, CSP headers, and production controls were verified.

