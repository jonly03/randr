# R&R Finest Auto Glass — Business Blueprint

A living visual model of the R&R Finest Auto Glass business process.

## Client demo hub

Open `whats-new.html` for the client-facing ecosystem update. It connects the business blueprint, public service preview, locally hosted operational application, interactive API documentation, delivery control, and GitHub work tracker in one guided demo. Reviewers can record objective-level validation and export it as structured JSON; responses remain in their browser until exported.

## Purpose

This blueprint captures the current understanding of how R&R:

1. Acquires work through insurance, auction, and direct-client channels
2. Receives a VIN and requested glass type
3. Identifies the vehicle and correct parts
4. Quotes, schedules, sources, and fulfills the job
5. Invoices, collects payment, and grows future demand

Confirmed facts, partially understood stages, and open discovery areas are deliberately distinguished.

## Live delivery control

`/control.html` is the read-only live delivery view. GitHub Issues and Projects remain the system of record; verified GitHub webhooks and authenticated specialist events feed the control surface over Server-Sent Events.

Configure these server-only values before receiving external events:

```bash
GITHUB_WEBHOOK_SECRET=<GitHub webhook secret>
DELIVERY_AGENT_EVENT_KEY=<specialist event key>
```

Register the GitHub webhook at `/api/delivery/webhooks/github` for `workflow_run`, `pull_request`, `issues`, and `issue_comment`. The dashboard never receives either secret. See [RR-026 design](project/features/live_delivery_control.md) for the event contract and candidate-demo controls.

## Preview locally

This is a dependency-free static site. Open `index.html` in a browser, or serve the folder with any static file server:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Current blueprint scope

- Eight-stage business lifecycle
- Insurance / Safelite, auction, and direct-client entry paths
- Unified job data model
- MyGrant VIN lookup automation definition
- Business rules currently confirmed
- Automation readiness roadmap
- Prioritized process-discovery questions

## Next evolution

The first working capability can be attached to **Stage 03 — Identify & Quote**:

- VIN text entry
- Glass type selection
- Server-side Playwright automation
- MyGrant result extraction
- Structured primary, interchangeable, and OEM part numbers

Image-based VIN extraction can follow as a separate capability.

## Status

## Client feedback

Every lifecycle stage and step includes a `+` control. Feedback is stored as structured JSON in the reviewer's browser using `localStorage`. The **Export feedback** control downloads a portable JSON file containing target IDs, action type, author, comment, timestamp, and review status.

The canonical process structure is maintained in `blueprint-data.js`. Because a static browser page cannot rewrite repository files directly, exported feedback should be reviewed and merged into that source file. A future authenticated backend can provide shared, server-side persistence.

Blueprint version 0.2 — September 14, 2026.
