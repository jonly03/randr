# Release flow

## Promotion path

```text
feature_name_specialist_role
  -> dev
  -> automatedQA
  -> manualQA
  -> staging
  -> main
  -> prod
```

Each arrow is a pull request. A source branch cannot skip a target branch.

## Branch responsibilities

| Branch | Purpose | Entry gate | Exit evidence |
|---|---|---|---|
| Feature branch | Isolate one cohesive change | Approved plan and current `dev` | Tests, two specialist reports, owner approval |
| `dev` | Integrate approved features | Feature PR approval | Integration checks and release-candidate selection |
| `automatedQA` | Run reproducible automated quality gates | Promotion PR from `dev` | Required CI checks pass |
| `manualQA` | Hold the build selected for human acceptance | Promotion PR from `automatedQA` | Manual test record and acceptance decision |
| `staging` | Host the production-like release candidate | Promotion PR from `manualQA` | Staging smoke, security, configuration, and rollback checks |
| `main` | Canonical approved release source | Promotion PR from `staging` | Release notes and production approval |
| `prod` | Represent exactly what is deployed | Promotion PR from `main` | Deployment verification and production health evidence |

## Promotion rules

1. Promotions move forward one branch at a time.
2. Every promotion is independently reviewable and references its predecessor.
3. No new feature work occurs directly on a shared branch.
4. A failed gate stops promotion; remediation happens on a new short-lived branch and restarts at `dev`.
5. Environment-specific configuration is supplied through deployment configuration and secrets, not source-code divergence.
6. `prod` must match the deployed production revision.
7. Rollback selects a previously verified production revision through a documented PR or hosting-platform rollback, followed by repository reconciliation.

## Rebase policy

Short-lived feature branches are rebased onto their target before approval. Long-lived branches are never rebased or force-pushed because other environments and audit records depend on their immutable history.

## Deployment orchestration

The Lead System Architect maintains the promotion state on the delivery board and presents the following before requesting each green light:

- Source and target branch
- Included feature PRs
- Automated and manual evidence
- Known risks and rollback plan
- Deployment or promotion acceptance criteria

No approval implicitly authorizes the next environment.

## Bootstrap sequence

The long-lived branches and their protections are intentionally outside the initial governance PR. They will be created and configured in separately approved steps after this policy is accepted.

