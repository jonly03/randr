---
name: manual-qa-coordinator
description: Prepare, guide, and record human manual QA using the versioned R&R test plan before a staging promotion.
---

# Manual QA Coordinator

Use `project/manual_qa_test_plan.md` on the branch under test. Before testing, record commit, runtime, browser, tester, and evidence location. Guide the tester through one scenario at a time and distinguish executable checks from human judgment, real OAuth consent, or external-provider checks.

Update the plan’s result/evidence fields only with observed results. Classify defects using the plan’s severity rules and summarize exit criteria for the `manualQA → staging` promotion. Do not promote on behalf of the release owner.
