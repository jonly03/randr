# Deployment controls

## Purpose

This document makes environment promotion auditable before R&R connects a hosting provider. It defines the evidence required to move an already-approved change through the delivery branches without creating a deployment, secret, credential, or vendor commitment.

## GitHub environments

| Environment | Branch represented | Protection now | Deployment capability |
|---|---|---|---|
| `dev` | `dev` | No reviewer gate | No external deployment configured |
| `automatedQA` | `automatedQA` | No reviewer gate | No external deployment configured |
| `manualQA` | `manualQA` | No reviewer gate | No external deployment configured |
| `staging` | `staging` | Required reviewer: `jonly03` | No external deployment configured |
| `prod` | `prod` | Required reviewer: `jonly03` | No external deployment configured |

The environments exist now so future deployment workflows use stable, reviewable names. RR-010 will connect Render only after its own PR, security review, and explicit production authority decision. No environment secret, variable, credential, or deployment endpoint is configured by RR-016.

## Owner-accepted temporary exception

The project owner chose to remain the sole deployment initiator and approver for the MLP. Therefore, `Prevent self-review` remains disabled on `staging` and `prod`, and deployment branches/tags remain unrestricted for now.

This is a conscious operational bottleneck, not a claim of separation of duties. Before RR-010 connects a hosting provider, the project must reassess whether to add a second human reviewer and restrict each environment to its matching promotion branch.

GitHub currently also allows repository administrators to bypass an environment approval gate. That privilege is not a substitute for the required reviewer.

## Promotion evidence

The `Deployment gates / Verify deployment evidence` check runs on each promotion PR after `dev`. It validates that the PR body contains the evidence appropriate to the target branch.

| Target | Minimum evidence |
|---|---|
| `automatedQA` | Automated verification |
| `manualQA` | Automated verification and manual-QA plan |
| `staging` | Manual-QA result, staging deployment plan, rollback revision |
| `main` | Staging verification, release candidate, rollback revision |
| `prod` | Release manifest, immutable artifact digest, production authorization, rollback revision |

The workflow validates evidence only; it does not deploy software. It uses `pull_request_target` without checking out PR code, so an untrusted feature branch cannot execute scripts with the workflow token.

## Release manifest

A promotion from `main` to `prod` must reference a snake_case Markdown manifest under `project/releases/`. The manifest records the immutable artifact digest, non-secret configuration revision, approval attestation, verification evidence, and named rollback revision as defined in [release_flow.md](release_flow.md).

## Current residual risks

- `jonly03` can start and approve a deployment to `staging` or `prod`; no independent deployment approval exists.
- The `staging` and `prod` environments accept deployment requests from unrestricted branches or tags.
- Repository administrators can bypass an environment reviewer gate.
- Shared-branch rulesets currently provide PR and linear-history controls, but required status checks cannot be enforced until these workflows reach those branches through the normal promotion path.
- GitHub environment rules alone do not deploy anything; RR-010 must add the provider connection and deployment workflow.

These residuals remain visible in Issue #5 until they are resolved by the appropriate PR and verified in GitHub.
