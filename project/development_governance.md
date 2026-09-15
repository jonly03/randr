# Development governance

## Purpose

This document defines how changes are proposed, reviewed, promoted, and released for R&R Finest Auto Glass. It applies to application code, tests, infrastructure, security policy, documentation, and emergency fixes.

## Non-negotiable controls

1. Every change starts on a short-lived branch and reaches a shared branch through a pull request.
2. Direct pushes to `dev`, `automatedQA`, `manualQA`, `staging`, `main`, and `prod` are prohibited.
3. A feature branch is rebased onto the latest target branch before final review.
4. Shared branch history is never rebased, force-pushed, or otherwise rewritten.
5. Every feature PR and every promotion PR requires at least two independent reviews from specialists in the affected engineering tribe.
6. The change author cannot review their own change.
7. The Lead System Architect decides whether a PR needs project-owner review or approval by applying the owner-attention policy; routine, fully evidenced changes do not wait for approval.
8. A failed review, test, or quality gate sends the change back to its originating branch.
9. Every promotion between shared branches uses a separate PR.
10. Production changes must be traceable from `prod` through every promotion PR to the originating feature PR.

## Branch naming

Short-lived branches use snake case:

```text
feature_name_specialist_making_change
```

Examples:

- `secure_session_frontend_engineer`
- `containerize_application_cloud_engineer`
- `mygrant_provider_backend_engineer`
- `oauth_rate_limit_security_engineer`

If more than one specialist implements the change, the accountable implementer names the branch. Contributors and reviewers are recorded in the PR.

## Starting and updating a feature branch

1. Start from the latest `dev` after the long-lived branches exist.
2. Make small, cohesive commits whose messages describe outcomes.
3. Before final review, fetch `dev` and rebase the feature branch onto it.
4. Resolve conflicts on the feature branch and rerun all affected tests.
5. Force-push only the rebased short-lived branch, using `--force-with-lease`.
6. Never rebase or force-push a shared branch.

The initial governance PR is an approved one-time bootstrap exception: `development_governance_lead_system_architect` starts from and targets `main` because `dev` does not yet exist. Until G2 completes, no application or infrastructure change may follow G1 into `main`. G2 must initialize every long-lived branch from the same accepted `main` commit and atomically apply every branch protection available to the repository plan and permissions. The exception expires when G2 completes; any unavailable protection is recorded as a blocking residual risk with an owner and deadline. All later feature PRs target `dev`.

## Pull request requirements

Every PR must contain:

- Business outcome and scope boundary
- Affected tribe and accountable specialist
- Risk and security impact
- Test evidence
- Rollback approach
- Two independent specialist review reports
- Source and target branches
- An owner-attention decision, rationale, and—when requested—the reviewed source and target SHAs
- Related board item and documentation

A PR remains a draft or unmerged while any required evidence is missing. Project-owner approval is required only when the owner-attention policy identifies an approval trigger.

## Temporary specialist-agent review policy

Until two human GitHub collaborators are available, at least two independent specialist agents from the affected tribe may produce review reports. Each reviewer uses a distinct agent instance without inherited reviewer context and cannot be the implementing agent. Reports are posted individually to the PR record so their task identities, timestamps, reviewed SHAs, findings, and decisions remain auditable in the PR conversation. G3 must add a required check that snapshots report identifiers and decisions into append-only build or release evidence before promotion.

Each report must:

- Identify the reviewer instance or name
- Identify the specialist role and review scope
- Record the review timestamp and exact commit SHA reviewed
- Inspect the complete proposed change independently
- State findings with severity and file references
- Record tests or checks performed
- Return `approved`, `approved_with_comments`, or `changes_requested`

The reports are evidence, not native GitHub approvals. They must be added to the PR record before merge. A `changes_requested` result blocks promotion until remediation is independently re-reviewed.

The temporary agent-review exception is limited to low-risk, non-security, non-production work until G2 and G3 deliver protected branches and durable evidence validation. Any PR relying on the exception outside that scope requires explicit project-owner approval bound to its current source and target SHAs. This temporary exception expires when two eligible human GitHub reviewers are onboarded or before the first production deployment, whichever occurs first. When human reviewers become available, protected branches require two native GitHub approvals. Agent reviews may continue as additional engineering evidence but do not replace the human approvals.

## Owner-attention policy

The Lead System Architect owns the decision to request the project owner's eyes on a PR. The PR records one of these outcomes:

- `autonomous merge`: two independent specialist reports and all required checks pass; no owner decision is needed.
- `owner review requested`: the owner is invited to inspect and comment, but lack of a response does not block merge when no approval trigger exists.
- `owner approval required`: merge or promotion pauses because the change needs an explicit business, risk, or authority decision.

Owner review is requested for material customer-facing UX changes and material security changes. This includes consent, accessibility, pricing or availability communication, major workflow changes, authentication or authorization behavior, handling of customer data, secrets, vulnerabilities, and security exceptions. The Lead System Architect summarizes the decision, risks, alternatives, and rollback path in the PR.

Owner approval is required only when there is a genuine decision or authority boundary. The following are mandatory, non-overridable triggers: any change to development governance, security policy, authentication, authorization, customer-data handling, secret management, or a production-impacting security or UX trade-off; requirements that are ambiguous; residual risk without an agreed owner; production deployment or rollback; destructive or irreversible data change; material spend, vendor commitment, credentials, or external-data access; and any category the project owner explicitly marks approval-required. Routine documentation, tests, internal refactors, and low-risk implementation changes proceed autonomously after their review and verification gates.

## Approval freshness

- Every specialist report, owner-attention decision, project-owner approval when required, and required check binds to the current source and target commit SHAs.
- Any source update, rebase, or force-push invalidates all earlier reports, approvals, and checks.
- Any target-branch head update invalidates approval and requires conflict analysis, refreshed checks, and affected reviews.
- Any owner-attention record includes the decision, rationale, timestamp, source SHA, and target SHA; an approval record also includes owner identity.
- Branch protection must dismiss stale approvals and require approval after the latest push when those controls are available.

## Tribe review matrix

| Change area | Owning tribe | Eligible reviewers |
|---|---|---|
| Client workflow, accessibility, browser behavior | Experience | UX Designer, UI Developer, Front-end Engineer, Design System Engineer |
| Express routes, providers, OpenAPI, persistence | Application Platform | Back-end Engineer, API Platform Engineer, Solution Designer |
| Authentication, authorization, secrets, threat controls | Security | Security Engineer, Back-end Engineer, Network Engineer |
| Containers, CI/CD, hosting, observability | Cloud Platform | Cloud Engineer, Network Engineer, Security Engineer |
| Architecture and cross-cutting process | Architecture | Solution Designer, Engineering Manager, senior engineer from each affected tribe |

Two reports are the minimum, not the maximum. For a cross-tribe change, at least one report must come from each materially affected tribe. The Lead System Architect orchestrates reviews but does not substitute for affected-tribe reviewers.

## Merge and promotion policy

- Feature PRs target `dev` and use GitHub's rebase merge after the branch is current and approved.
- The one-time G1 governance PR targets `main` under the documented bootstrap exception.
- Promotion PRs require at least two independent affected-tribe reports, an owner-attention decision, and the evidence defined in the release flow; explicit project-owner approval is required only when the owner-attention policy triggers it.
- Shared branches are advanced only by an approved promotion PR.
- A change is not complete when it reaches `dev`; it is complete only at the environment required by its acceptance criteria.
- Emergency code fixes follow the same PR and review controls, using an expedited review window rather than bypassing controls.
- Deployment configuration and secret-setting changes require the same review, approval, audit, and rollback evidence as source changes. Secret values never enter source control or review evidence.

## Ownership

- Product Manager and Engineering Manager equally own feature outcomes.
- The implementing specialist owns technical execution and evidence.
- Reviewers own independent challenge of correctness, risk, and maintainability.
- The Lead System Architect owns sequencing, architecture coherence, board state, and promotion orchestration.
- The project owner provides direction and approval for escalated decisions, and retains final authority for deployments, external commitments, and other approval-triggering actions.
