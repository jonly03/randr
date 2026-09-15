# RR-007.1: OAuth callback asset resolution

## Status

Done

## Problem

After successful authorization, Express returned the client document at `/oauth/callback`. Relative stylesheet and script URLs were therefore interpreted as `/oauth/client.css`, `/oauth/oauth-client.js`, and similar paths. Those routes returned `404` HTML responses, so the browser rejected them by MIME type and displayed a blank page.

## Decision

- Keep repository assets relative for the GitHub Pages project path.
- Declare `<base href="./">` in the repository `index.html`.
- Replace that declaration with `<base href="/">` when Express serves the operational client.
- Keep the OAuth callback at `/oauth/callback`; no redirect or OAuth configuration change is required.

## Acceptance evidence

- Express root and callback documents declare the origin-relative base `/`.
- Callback-relative asset references resolve to `/client.css`, `/oauth-client.js`, `/api-client.js`, and `/client.js`.
- JavaScript and CSS routes return their correct content types.
- `/oauth/client.js` remains unavailable.
- The repository document retains `./`, resolving assets beneath the GitHub Pages `/randr/` project path.
- The complete automated test suite passes.

## Scope boundary

This hotfix does not containerize the application, change OAuth semantics, integrate MyGrant, or begin roadmap Step 3.
