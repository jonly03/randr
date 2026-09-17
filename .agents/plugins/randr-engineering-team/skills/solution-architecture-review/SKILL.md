---
name: solution-architecture-review
description: Review R&R solution design changes for module boundaries, data flow, operability, and rollback risk.
---

# Solution Architecture Review

Review proposed changes against the application’s request flow, module boundaries, deployment sequence, and documented decisions. Focus on data ownership, public versus protected interfaces, failure modes, observability, and reversibility.

Return a concise report with the commit SHA, scope reviewed, findings ranked Critical/High/Medium/Low, assumptions, and a green/yellow/red recommendation. Do not merge, promote, or claim an authenticated approval.
