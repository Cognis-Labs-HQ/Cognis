# Administration Saves

**Feature Branch:** feature-administration-security-save

## Administration Saves

Administration saves only sections with pending changes. Security controls become editable after both security settings and password policy load successfully. A form redraw preserves pending edits; leaving a changed section still requires the existing discard confirmation. A partial save keeps failed or newer edits pending, so retry does not resend settings already saved. The Security tutorial continues to explain session policy and trusted domains.

## Translation Recovery

Connection recovery invalidates core and component translation snapshots before pages redraw. Explicit bundle refreshes fetch current server content while retaining complete offline snapshots during outages. Non-resource XML responses fail validation and are evicted so a subsequent load can recover without a hard refresh.

## Initial Email Verification

`tfa:getLoginMethods(accountId)` prepares a challenge only when one method is available and no unused recovery codes exist. Otherwise the login UI requests a challenge through `POST /api/v1/tfa/login/resend` for the initially selected method when its `challengeOnSelect` metadata is true, and for subsequent selections without an existing challenge. Server-prepared challenges are reused. Delivery failures show a localized error; gateway logs record method, account, readiness and failure reason without codes or email content.

## Gateway-Controlled Diagnostics

Application logging now controls server delivery and browser-console visibility for translation, TFA and offline-worker diagnostics. Gateway authorization and severity determine browser output; diagnostic metadata excludes credentials and raw error messages.

## Logging Boundary

Source checks enforce gateway logging in application and external-module code, including browser scripts and event handlers. Diagnostic producers use the gateway directly, while command and build reports retain terminal output.

## Commits

- [996af37783915d3246df5c1fc1044b01c4f46fa1](https://github.com/Cognis-Labs-HQ/Cognis/commit/996af37783915d3246df5c1fc1044b01c4f46fa1)
- [bce901458c323767adc2321ac3b5d1a1146c95c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/bce901458c323767adc2321ac3b5d1a1146c95c7)
- [947677579880703dff73f7acdfd27c9ee3ef02cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/947677579880703dff73f7acdfd27c9ee3ef02cb)
- [18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa)
- [fa239f1b4e9dc5f0ca34c10e6ada95b95014a227](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa239f1b4e9dc5f0ca34c10e6ada95b95014a227)
- [57fe89b2259021a0e015d76a950bd35f64376184](https://github.com/Cognis-Labs-HQ/Cognis/commit/57fe89b2259021a0e015d76a950bd35f64376184)
- [3167a5a53da2ed87485b7b9df244b7edc9bf5089](https://github.com/Cognis-Labs-HQ/Cognis/commit/3167a5a53da2ed87485b7b9df244b7edc9bf5089)
