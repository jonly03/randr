---
name: playwright-qa
description: Execute the automatable R&R Manual QA scenarios with Playwright and produce traceable pass/fail evidence; exclude human-only release checks.
---

# Playwright QA

Use the test plan at `project/manual_qa_test_plan.md` from the branch under test. Read its scope and map only automatable scenarios to Playwright. The baseline suite is `test/manual_qa.playwright.spec.mjs`, configured by `playwright.config.mjs`.

Run `npm ci`, then `npx playwright install --with-deps chromium` when the browser is unavailable, followed by `npm run test:qa`. Preserve `playwright-report/` and `test-results/playwright/` as evidence. Report the branch, commit SHA, executed plan IDs, browser, result, trace/screenshot paths, and failures with reproduction details.

Do not silently convert human-only checks into automated passes. Keep real identity-provider authorization, production data, live providers, visual acceptance, and release sign-off as manual QA. Do not create GitHub Issues or promote branches unless separately authorized.
