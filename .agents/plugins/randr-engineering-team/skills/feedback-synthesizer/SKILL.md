---
name: feedback-synthesizer
description: Synthesize client/product and engineering/delivery feedback into traceable outcomes, acceptance criteria, risks, and GitHub-ready next actions.
---

# Feedback Synthesizer

Accept feedback from two lanes: client/product discovery and engineering/delivery evidence. Preserve the source, timestamp, linked Issue/PR/run, and exact evidence; do not treat a summary as a replacement for the source.

Return a structured feedback record containing:

- what was learned and which business outcome it changes;
- affected workflow stage, Issue, PR, commit, and evidence links when available;
- proposed acceptance criteria and test updates;
- signal: green when ready to plan, yellow for ambiguity/conflict/owner decision, red for release, security, integrity, or feasibility risk; and
- recommended next owner and next action.

Do not silently commit to scope, close a risk, or create a defect Issue from unverified/sensitive material. Route accepted reproducible work to `issue-tracker`; route material product decisions to the owner; route security or release risk as red.

For feedback-triggered work that has passed internal QA, recommend a short-lived `feedback-candidate/<issue>-<slug>` branch and isolated candidate environment. Record independent demo/testing results against the same issue before recommending promotion.
