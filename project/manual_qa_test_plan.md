# Manual QA Test Plan — VIN Lookup MLP

## Test run record

| Field | Tester entry |
|---|---|
| Plan version | 1.1 |
| Branch / commit | |
| Test date and time | |
| Tester | |
| Browser and version | |
| Runtime URL | |
| Overall result | Pass / Fail / Blocked |
| Evidence location | Screenshots, screen recording, notes, and network export |

## Scope

This plan verifies the current R&R Finest Auto Glass MLP before a staging promotion:

- operational Express-served client and its OAuth PKCE demo flow;
- VIN lookup journey and structured part results through the protected mock API;
- glass-type path rules;
- error/recovery behavior;
- static-demo labeling and client-feedback export;
- API documentation access appropriate to the environment.\n- live delivery-control rendering, authenticated agent-event ingestion, and SSE updates;\n- GitHub workflow-event classification and the feedback-candidate handoff.

### Out of scope

- MyGrant / Playwright automation
- production identity-provider authentication
- live customer data, quotes, payments, or scheduling
- image-to-VIN extraction
- any production deployment

## Preconditions

1. Use the exact branch/commit recorded above.
2. Start the operational application:

   ```bash
   npm ci
   npm start
   ```

3. Open `http://localhost:3000`.
4. Open browser Developer Tools → Network; preserve the log.
5. Do not enter real VINs, credentials, customer information, or provider data.
6. Capture a screenshot for every failed or blocked test.\n7. Set local-only delivery-control secrets before starting the application:\n\n   ```bash\n   export GITHUB_WEBHOOK_SECRET=local-webhook-secret\n   export DELIVERY_AGENT_EVENT_KEY=local-agent-key\n   ```

## Test cases

| ID | Scenario | Steps | Expected result | Result | Evidence |
|---|---|---|---|---|---|
| MQ-01 | Operational entry point | Open `/`. | The app loads as the operational client; no static-demo label or public mock-data path is presented. | | |
| MQ-02 | OAuth authorization and return | Start a lookup that needs authorization; complete the demo authorization redirect. | The browser returns to the app, restores the in-progress workflow, and permits protected catalog/API requests. | | |
| MQ-03 | PKCE state protection | In a separate session, alter the `state` callback parameter before completing authorization. | Authorization is rejected safely; no lookup runs; the app provides a clear recovery path. | | |
| MQ-04 | Windshield lookup path | Select **Windshield**, enter a non-production test VIN, and submit. | The flow begins with VIN; the result identifies the vehicle and returns structured primary, interchangeable, and OEM part information when available. | | |
| MQ-05 | Back Glass lookup path | Select **Back Glass**, enter a non-production test VIN, and submit. | The flow begins with VIN and returns a structured result or a clear no-match message. | | |
| MQ-06 | Door Glass lookup path | Select **Door Glass**; choose Year → Make → Model, then enter VIN. | The UI enforces the Year → Make → Model → VIN sequence and does not submit incomplete selections. | | |
| MQ-07 | Input validation | Submit an empty, malformed, or too-short VIN. | The request is blocked or returns a clear validation error; the browser does not crash. | | |
| MQ-08 | Service failure recovery | With DevTools, simulate offline mode or block one `/api/v1` request; retry the lookup. | The user sees a clear failure message and can retry or reauthorize without losing control of the app. | | |
| MQ-09 | Token expiry recovery | Complete authorization, then use the application long enough to trigger or simulate an expired/invalid token response. | The client explains that authorization expired and starts a safe reauthorization path; it does not expose a token. | | |
| MQ-10 | Network boundary | Review the Network log during MQ-02 through MQ-09. | Operational lookup traffic uses `/api/v1` with bearer authorization. `/mock-server/lookup-data.json` is not successfully served. | | |
| MQ-11 | Swagger API documentation | Open `/api/docs`; use **Authorize** and one read-only API request. | Swagger loads in this non-production local runtime, authorization completes, and the documented endpoint responds consistently with the client. | | |
| MQ-12 | Static-demo clarity | Open the repository’s static `index.html` using a static file server or GitHub Pages path. | It is visibly labeled **Static Demo · Public mock data** and is distinguishable from the operational application. | | |
| MQ-13 | Blueprint feedback | In the business blueprint, add a comment with a stage/step `+` control; export feedback. | The export is valid JSON with target ID, action type, author, comment, timestamp, and review status. | | |
| MQ-14 | Cross-browser smoke | Repeat MQ-01, MQ-04, MQ-06, and MQ-13 in a second current browser. | No blocking layout, navigation, lookup, or export defect occurs. | | |\n| MQ-15 | Delivery-control entry point | Open `/control.html`. | The live operating console loads, shows the delivery pipeline and event stream, and exposes no webhook or agent secret in page source, browser storage, or network responses. | | |\n| MQ-16 | Authenticated specialist event | POST a unique yellow `gate.awaiting_infrastructure` event to `/api/delivery/events` with `x-delivery-agent-key: local-agent-key`. | The request succeeds and one matching yellow item appears in the attention queue without a page refresh. | | |\n| MQ-17 | Reject unauthenticated specialist event | Repeat MQ-16 without the agent key and then with an incorrect key. | Both requests are rejected; neither event appears in the dashboard or event snapshot. | | |\n| MQ-18 | Live multi-client update | Open `/control.html` in two tabs, then submit one unique authenticated event. | Both tabs display the event without refresh and show the same signal, headline, subject, and evidence link. | | |\n| MQ-19 | SSE reconnect and snapshot | After MQ-18, take one tab offline briefly, reconnect it, then refresh it. | The tab reconnects without crashing and restores the current event snapshot without creating duplicates. | | |\n| MQ-20 | Duplicate-event idempotency | Submit the exact MQ-16 payload twice with the same event ID. | The dashboard and snapshot contain one logical event, not two attention items. | | |\n| MQ-21 | GitHub success classification | Deliver a correctly signed `workflow_run` webhook fixture whose conclusion is `success`. | The dashboard records the workflow as green and links to the supplied GitHub run evidence. | | |\n| MQ-22 | GitHub failure/cancellation classification | Deliver correctly signed `workflow_run` fixtures whose conclusions are `failure` and `cancelled`. | Each event is red, identifies its PR or branch and workflow, and appears in the owner-attention queue. | | |\n| MQ-23 | GitHub webhook authentication | Deliver a webhook fixture with a missing or invalid signature. | The request is rejected and causes no dashboard state change. | | |\n| MQ-24 | Feedback-candidate readiness | Review the candidate PR evidence fields and candidate workflow for a `feedback-candidate/RR-026-live-delivery-dashboard` branch. | The candidate is tied to RR-026, an exact verified commit, acceptance criteria, test evidence, and an isolated candidate URL; absent hosting is shown as yellow rather than falsely green. | | |

## Severity and disposition

| Severity | Meaning | Promotion rule |
|---|---|---|
| Critical | Security exposure, unauthorized data access, broken authorization, or application unavailable | Block promotion |
| High | Primary lookup path fails, incorrect parts response, or loss of user workflow | Block promotion |
| Medium | Recovery, validation, or non-primary behavior is misleading or unreliable | Record and decide before staging |
| Low | Cosmetic or copy issue with a viable workflow | Record; does not block by itself |

## Exit criteria

- MQ-01 through MQ-10 pass with no Critical or High defect.
- MQ-11 through MQ-14 are recorded as Pass, Fail, or an approved exception.
- The tester records the exact commit, runtime URL, browser, date, evidence, and overall result.
- Any failure includes reproduction steps and a severity.
- The Lead Engineer summarizes the outcome in the `manualQA → staging` promotion PR before it is opened.

## Tester sign-off

| Field | Entry |
|---|---|
| Manual QA result | Pass / Fail / Pass with approved exceptions |
| Blocking defects | |
| Approved exceptions | |
| Tester name | |
| Date/time | |
