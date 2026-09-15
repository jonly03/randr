---
name: github-delivery
description: Manage R&R pull-request promotion, Actions evidence, branch order, and configured release gates.
---

# GitHub Delivery

Use the repository as the source of truth. Verify the current SHA, PR target, required checks, and promotion order before a merge or promotion. Routine branches require passing automated checks; staging and production remain subject to their configured authenticated environment approvals.

For an Actions failure, inspect the failed job logs before reporting its root cause. Never retry, merge, or change a protection rule without appropriate authorization. Return links to the PR/run, SHA, check state, and next action.
