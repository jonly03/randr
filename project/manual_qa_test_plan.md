# Manual QA Test Plan — VIN Lookup MLP

## Test run record

| Field | Tester entry |
|---|---|
| Plan version | 1.0 |
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
- API documentation access appropriate to the environment.

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
6. Capture a screenshot for every failed or blocked test.

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
| MQ-14 | Cross-browser smoke | Repeat MQ-01, MQ-04, MQ-06, and MQ-13 in a second current browser. | No blocking layout, navigation, lookup, or export defect occurs. | | |

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
