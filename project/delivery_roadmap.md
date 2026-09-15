# Delivery roadmap

## Operating agreement

This roadmap is executed one step at a time. Before each step, the Lead System Architect presents its plan, affected files or infrastructure, risks, and acceptance criteria. Execution begins only after the project owner gives explicit approval.

Specialist work is also sequenced. Implementation, security review, testing, and acceptance do not run as parallel feature tracks. The delivery board is updated when a step begins, becomes blocked, enters review, or is completed.

## Architectural direction

- Deployment style: Containerized modular monolith
- MLP staging host: Render
- Application origin: One origin for static frontend, Express API, OAuth callbacks, and Swagger
- Public/static demonstrations: GitHub Pages
- Lookup boundary: Interchangeable mock and MyGrant providers
- Future production candidate: Cloud Run, subject to later operational analysis
- First possible extraction: Playwright lookup worker, only when supported by measured requirements

## Sequential steps

| Step | Board item | Outcome | Depends on | Execution state |
|---|---|---|---|---|
| G1 | RR-013 Development Governance | Establish branch, PR, review, and promotion policy | None | Review / owner approval |
| G2 | RR-014 Long-lived Branches | Create `dev`, `automatedQA`, `manualQA`, `staging`, and `prod` | RR-013 | Planned |
| G3 | RR-015 Branch Protection | Enforce PR and available review controls on shared branches | RR-014 | Planned |
| G4 | RR-016 Quality and Deployment Gates | Connect checks and deployments to the promotion flow | RR-015 | Planned |
| 1 | Architecture record | Establish the approved deployment and delivery direction | None | Complete |
| 2 | RR-007 Frontend/API Integration | Browser uses OAuth PKCE and protected mock API endpoints | Step 1 | Complete |
| 2.1 | RR-007.1 OAuth Callback Asset Resolution | Ensure callback assets load in Express without breaking the GitHub Pages project path | RR-007 | Complete |
| 3 | RR-008 Containerize Application | Create a reproducible Playwright-ready application image | RR-007, RR-016 | Blocked by governance setup |
| 4 | RR-009 Verify Container Locally | Prove the image, frontend, OAuth, Swagger, and API work locally | RR-008 | Planned |
| 5 | RR-010 Prepare Render Configuration | Define staging service, environment, health checks, and secrets | RR-009 | Planned |
| 6 | RR-011 Deploy Render Staging | Run the modular monolith at one HTTPS staging origin | RR-010 | Planned |
| 7 | RR-012 Verify Staging | Validate deployed application behavior and operational signals | RR-011 | Planned |
| 8 | RR-003A MyGrant Feasibility Spike | Prove authentication, navigation, extraction, and hosting feasibility | RR-012 | Planned |
| 9 | RR-003 MyGrant Provider | Replace the mock implementation behind the stable provider contract | RR-003A | Planned |
| 10 | Architecture reevaluation | Decide whether Playwright remains internal or becomes a queued worker | Measured MyGrant behavior | Planned |

## Approval gate

Completion of one step does not authorize the next. Each step requires a new explicit green light.

Governance bootstrap steps G1 through G4 now precede application roadmap Step 3. The first governance branch starts from `main` because `dev` does not exist until G2.
