# Architecture decisions

## ADR-001: The workflow owns the lookup capability

- Date: 2026-09-14
- Status: Accepted
- Decision: Model VIN and glass lookup as a step within an auto-glass service request rather than as the top-level product.
- Reason: Quoting, scheduling, fulfillment, invoicing, and payment can be added without rebuilding the product boundary.

## ADR-002: Use interchangeable lookup providers

- Date: 2026-09-14
- Status: Accepted
- Decision: Place mock, Playwright, and future API integrations behind one lookup-service contract.
- Reason: The client experience and Express routes should not change when the integration mechanism changes.

## ADR-003: Validate the static client journey first

- Date: 2026-09-14
- Status: Accepted
- Decision: Use GitHub Pages and mock JSON for the first client demo before implementing the backend.
- Reason: The client approved the workflow, reducing product risk before integration investment.

## ADR-004: Track delivery as structured data

- Date: 2026-09-14
- Status: Accepted
- Decision: Use `project/board.json` as the Kanban source of truth and render it in a read-only project board.
- Reason: Humans and specialized agents can update the same auditable project state.

## ADR-005: Protect the API with OAuth 2.0 Authorization Code and PKCE

- Date: 2026-09-15
- Status: Accepted for development scaffold
- Decision: Require bearer access tokens for lookup endpoints and issue demo tokens through Authorization Code with PKCE using the `S256` challenge method.
- Reason: Establish the intended public-client authentication boundary before replacing the mock provider with browser automation.
- Constraint: The in-process authorization server is for development only. Production must use an independently operated identity provider and standards-reviewed token validation.

## ADR-006: Treat OpenAPI as the HTTP contract

- Date: 2026-09-15
- Status: Accepted
- Decision: Maintain `server/openapi.yaml` as the machine-readable contract and publish Swagger UI for development testing.
- Reason: Consumers can discover, authorize, and exercise the API without relying on undocumented implementation details.
- Constraint: The Swagger UI and raw contract are disabled by default in production and must be explicitly enabled and access-controlled when operationally required.

## ADR-007: Deploy the MLP as a containerized modular monolith

- Date: 2026-09-15
- Status: Accepted
- Decision: Package the client interface, Blueprint, delivery board, Express API, API documentation, and lookup-provider boundary as one containerized application served from one origin.
- Hosting direction: Use Render with a Docker deployment for the MLP staging environment. Retain Cloud Run as a possible later production target without committing to a migration.
- Reason: One deployable application reduces OAuth callback, CORS, configuration, versioning, and operational complexity while the product and MyGrant integration are still being validated.
- Internal boundary: Keep the mock and MyGrant implementations behind the lookup-provider contract so modularity does not depend on separate deployments.
- GitHub Pages: Retain it only as a public/static demonstration surface, not as the operational application host.
- Extraction rule: Separate Playwright into a worker only when measured latency, concurrency, failure isolation, security, or independent-scaling requirements justify the additional distributed-system complexity.
- Delivery rule: Execute the roadmap sequentially and obtain the project owner's explicit approval before beginning every step.

## ADR-008: Separate operational and static demonstration modes

- Date: 2026-09-15
- Status: Accepted
- Decision: The repository `index.html` defaults to an explicitly labeled Static Demo for GitHub Pages, while Express injects Operational mode when serving the same client interface.
- Operational rule: Operational mode uses OAuth PKCE and protected `/api/v1` endpoints exclusively. It never reads or silently falls back to public mock JSON.
- Static rule: Static Demo mode may read the public mock JSON but must identify that behavior visibly to the user.
- Token rule: Keep the short-lived access token in browser memory only. Store only the single-use OAuth transaction and minimal workflow snapshot in `sessionStorage` across the redirect.
- Reason: Preserve the approved public demonstration while creating an unambiguous, secure integration path for the modular monolith.

