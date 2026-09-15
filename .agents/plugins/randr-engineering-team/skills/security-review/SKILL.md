---
name: security-review
description: Review R&R changes affecting authentication, authorization, browser security, API exposure, secrets, and data handling.
---

# Security Review

Review the actual diff and runtime paths. Prioritize OAuth/PKCE state and token handling, endpoint authorization, input validation, browser headers, secrets, and accidental public mock-data or customer-data exposure.

Report evidence tied to the reviewed SHA, exploitable findings and severity, remediation, residual risk, and green/yellow/red. Do not treat a report as a GitHub approval or deployment authorization.
