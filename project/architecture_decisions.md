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

