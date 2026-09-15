# RR-026: Live delivery control and feedback loop

## Outcome

Give product, engineering, and the release owner one live, read-only view of GitHub work and specialist evidence while preserving GitHub Issues/Projects as the system of record.

## Event contract

The server accepts only verified GitHub webhooks and authenticated specialist events. Each stored event carries a stable id, source, type, timestamp, subject (Issue/PR/run/branch/SHA), signal, concise summary, and evidence URL. Duplicate ids are ignored; events are bounded in memory for the MLP. A deployment-grade persistence adapter is a follow-up before relying on restart durability.

## Candidate feedback loop

Client/product and engineering/delivery feedback flow through `feedback-synthesizer`. Once the resulting change passes the internal path through `manualQA`, a short-lived candidate branch and isolated `feedback-candidate` environment support independent demo/testing. A green candidate is evidence for—not a bypass around—the normal promotion path.

## Integrity checks

- HMAC verification covers raw GitHub webhook bytes.
- Event IDs make delivery idempotent and safe for redelivery.
- Browser clients receive a snapshot before live SSE events, enabling reconnect recovery.
- The dashboard contains no webhook or agent secret and cannot edit GitHub work.
- Failed/cancelled GitHub Actions classify red; incomplete/attention-needed updates classify yellow.

## Hosting prerequisite

The repository does not currently have a configured candidate deployment provider or public deployment URL. The included GitHub workflow validates candidate eligibility and records the environment gate; configuring an actual isolated deployment target remains required before independent remote client demos can occur.
