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
| `prod` | Represent exactly what is deployed | Promotion PR from `main` plus release manifest | Deployment verification and production health evidence |

## Promotion rules

1. Promotions move forward one branch at a time.
2. Every promotion requires at least two independent affected-tribe review reports, project-owner approval, and a reference to its predecessor.
3. No new feature work occurs directly on a shared branch.
4. A failed gate stops promotion; remediation happens on a new short-lived branch and restarts at `dev`.
5. Environment-specific configuration is supplied through deployment configuration and secrets, not source-code divergence.
6. `prod` must match the deployed production revision and immutable artifact digest recorded in the release manifest.
7. The promotion PR records the exact source and target commit SHAs when opened and again when approved.
8. During the current sequential MLP workflow, the source branch is frozen while its promotion PR is open.
9. Any source or target head update invalidates reports, owner approval, and checks and requires conflict analysis plus fresh evidence.
10. Repository configuration, deployment configuration, and secret-setting changes follow PR-equivalent review and audit controls; secret values are never recorded.

## Release manifest

Before production approval, create an immutable candidate manifest with a snake-case Markdown filename under `project/releases/`. It records:

- Release identifier and timestamp
- Complete promotion-PR chain
- Approved source and target commit SHAs
- Immutable container or deployment artifact digest
- Non-secret configuration revision
- Deployment platform record or identifier
- Automated, manual, staging, and security evidence
- Named rollback revision and artifact digest
- The location and required fields of the final approval attestation

Final approval does not modify the candidate manifest. It is retained as an immutable PR or deployment attestation containing approver identity, timestamp, candidate-manifest commit SHA, current source and target SHAs, and accepted residual risks. The deployed revision is not accepted until its digest and health evidence match the candidate manifest and its final attestation.

## Emergency rollback

The project owner and Engineering Manager may jointly authorize an immediate hosting-platform rollback to the manifest's named verified artifact when active production harm makes the normal PR sequence unsafe. The operator records identities, reason, affected release, selected digest, and timestamp before execution when possible, and immediately afterward otherwise.

Post-rollback health verification is mandatory. `prod` and the release manifest must be reconciled through a PR within 24 hours. Until reconciliation completes, the board displays an active production incident and no unrelated promotion proceeds.

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

G1 is a one-time exception that starts from and targets `main`. After this policy is accepted, G2 creates all long-lived branches from that same accepted `main` commit and applies PR-only changes, stale-approval dismissal, approval after the latest push, conversation resolution, no force-push, no deletion, restricted bypass, administrator enforcement, and required checks wherever the repository plan and permissions support them. Any unavailable control is documented as a blocking residual risk. G3 adds repository validators and quality checks; G4 connects deployment gates.
