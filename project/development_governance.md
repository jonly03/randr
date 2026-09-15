# Development governance

## Purpose

This document defines how changes are proposed, reviewed, promoted, and released for R&R Finest Auto Glass. It applies to application code, tests, infrastructure, security policy, documentation, and emergency fixes.

## Non-negotiable controls

1. Every change starts on a short-lived branch and reaches a shared branch through a pull request.
2. Direct pushes to `dev`, `automatedQA`, `manualQA`, `staging`, `main`, and `prod` are prohibited.
3. A feature branch is rebased onto the latest target branch before final review.
4. Shared branch history is never rebased, force-pushed, or otherwise rewritten.
5. Every feature PR and every promotion PR requires two independent reviews from specialists in the affected engineering tribe.
6. The change author cannot review their own change.
7. The project owner provides the final approval after both specialist reports are complete.
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

The initial governance PR is an approved one-time bootstrap exception: `development_governance_lead_system_architect` starts from and targets `main` because `dev` does not yet exist. After this policy is accepted, G2 initializes every long-lived branch from the same accepted `main` commit so the promotion chain begins without divergence. All later feature PRs target `dev`.

## Pull request requirements

Every PR must contain:

- Business outcome and scope boundary
- Affected tribe and accountable specialist
- Risk and security impact
- Test evidence
- Rollback approach
- Two independent specialist review reports
- Project-owner approval status
- Source and target branches
- Related board item and documentation

A PR remains a draft or unmerged while any required evidence is missing.

## Temporary specialist-agent review policy

Until two human GitHub collaborators are available, two independent specialist agents from the affected tribe may produce review reports.

Each report must:

- Identify the reviewer instance or name
- Identify the specialist role and review scope
- Record the review timestamp and exact commit SHA reviewed
- Inspect the complete proposed change independently
- State findings with severity and file references
- Record tests or checks performed
- Return `approved`, `approved_with_comments`, or `changes_requested`

The reports are evidence, not native GitHub approvals. They must be added to the PR record before the project owner approves. A `changes_requested` result blocks promotion until remediation is independently re-reviewed.

When human reviewers become available, protected branches will require two native GitHub approvals. Agent reviews may continue as additional engineering evidence but will not replace the human approvals.

## Tribe review matrix

| Change area | Owning tribe | Eligible reviewers |
|---|---|---|
| Client workflow, accessibility, browser behavior | Experience | UX Designer, UI Developer, Front-end Engineer, Design System Engineer |
| Express routes, providers, OpenAPI, persistence | Application Platform | Back-end Engineer, API Platform Engineer, Solution Designer |
| Authentication, authorization, secrets, threat controls | Security | Security Engineer, Back-end Engineer, Network Engineer |
| Containers, CI/CD, hosting, observability | Cloud Platform | Cloud Engineer, Network Engineer, Security Engineer |
| Architecture and cross-cutting process | Architecture | Solution Designer, Engineering Manager, senior engineer from each affected tribe |

For a cross-tribe change, at least one report must come from each materially affected tribe. The Lead System Architect orchestrates reviews but does not substitute for both affected-tribe reviewers.

## Merge and promotion policy

- Feature PRs target `dev` and use GitHub's rebase merge after the branch is current and approved.
- The one-time G1 governance PR targets `main` under the documented bootstrap exception.
- Promotion PRs require two independent affected-tribe reports, project-owner approval, and the evidence defined in the release flow.
- Shared branches are advanced only by an approved promotion PR.
- A change is not complete when it reaches `dev`; it is complete only at the environment required by its acceptance criteria.
- Emergency fixes follow the same PR and review controls, using an expedited review window rather than bypassing controls.

## Ownership

- Product Manager and Engineering Manager equally own feature outcomes.
- The implementing specialist owns technical execution and evidence.
- Reviewers own independent challenge of correctness, risk, and maintainability.
- The Lead System Architect owns sequencing, architecture coherence, board state, and promotion orchestration.
- The project owner owns final approval at every explicit green-light gate.
