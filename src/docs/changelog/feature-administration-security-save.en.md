# Administration Saves

**Feature Branch:** feature-administration-security-save

## Administration Saves

Administration saves only sections with pending changes. Security controls become editable after both security settings and password policy load successfully. A form redraw preserves pending edits; leaving a changed section still requires the existing discard confirmation. A partial save keeps failed or newer edits pending, so retry does not resend settings already saved. The Security tutorial continues to explain session policy and trusted domains.

## Translation Recovery

Connection recovery refreshes previously loaded translation bundles before redrawing pages. Ordinary reads retain immediate offline-cache access; invalid XML is rejected and retried with a refresh.

## Initial Email Verification

Initial email challenges are requested when the selected method requires delivery. Delivery and resend requests have a 15-second deadline and do not block authenticator or recovery-code verification. Pending requests are deduplicated and canceled when a new login prompt opens.

## Gateway-Controlled Diagnostics

Application logging controls server delivery and browser visibility through gateway authorization and severity. Server and browser consumers share one catalog of levels, priorities and console aliases. Diagnostic metadata excludes credentials and raw error messages. Logging is contributed by its gateway through ctx; core only supplies generic capability readiness and bounded deferred calls.

## Logging Boundary

Source checks enforce gateway logging in application and external-module code, including browser scripts and event handlers. Script extraction handles browser-accepted closing-tag whitespace and attributes, quoted delimiters and unclosed scripts. Command and build reports retain terminal output.

## Commits

- [996af37783915d3246df5c1fc1044b01c4f46fa1](https://github.com/Cognis-Labs-HQ/Cognis/commit/996af37783915d3246df5c1fc1044b01c4f46fa1)
- [bce901458c323767adc2321ac3b5d1a1146c95c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/bce901458c323767adc2321ac3b5d1a1146c95c7)
- [947677579880703dff73f7acdfd27c9ee3ef02cb](https://github.com/Cognis-Labs-HQ/Cognis/commit/947677579880703dff73f7acdfd27c9ee3ef02cb)
- [18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa](https://github.com/Cognis-Labs-HQ/Cognis/commit/18709e6e484e6c7bf6ddb333d06ffdebdb3b71fa)
- [fa239f1b4e9dc5f0ca34c10e6ada95b95014a227](https://github.com/Cognis-Labs-HQ/Cognis/commit/fa239f1b4e9dc5f0ca34c10e6ada95b95014a227)
- [57fe89b2259021a0e015d76a950bd35f64376184](https://github.com/Cognis-Labs-HQ/Cognis/commit/57fe89b2259021a0e015d76a950bd35f64376184)
- [3167a5a53da2ed87485b7b9df244b7edc9bf5089](https://github.com/Cognis-Labs-HQ/Cognis/commit/3167a5a53da2ed87485b7b9df244b7edc9bf5089)
