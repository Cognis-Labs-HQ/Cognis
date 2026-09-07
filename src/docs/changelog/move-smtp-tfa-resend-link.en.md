# SMTP TFA Resend & Rate Limits

**Feature Branch:** copilot/move-smtp-tfa-resend-link

## Summary

The "Resend email code" link in the SMTP two-factor authentication screen now
appears on its own line directly below the code input field instead of inline
with the action area.

The resend countdown that tracks the SMTP send rate limit is now restored
correctly. The countdown begins as soon as the rate-limited state is detected,
whether that is on the initial challenge or after a failed resend attempt.

SMTP-backed login challenges now switch into the TFA prompt as soon as the
verification email has been queued instead of waiting for SMTP delivery to
finish. If the mail queue is still inside the recipient rate-limit window, the
login UI receives the countdown immediately and keeps the last live code valid
until the queued send can run.

The TFA screen is now preserved when the browser viewport changes between mobile
and desktop layout. Previously, resizing the viewport while at the TFA step
would reset the page to the credential screen. The active TFA prompt is now
restored automatically after any layout re-render so the user does not lose
their place.

When the SMTP login flow sends a code automatically, the toast now confirms
that the code was sent instead of warning about the resend cooldown. The resend
link still shows the cooldown countdown so the current rate limit remains clear.

SMTP codes are no longer sent on page load when multiple TFA methods are
available. The login server now initiates a challenge only when the user has
exactly one configured method. When multiple methods are present, no challenge
is started until the user explicitly selects a method tab — at which point the
client triggers a challenge via the resend endpoint. Subsequent tab switches
back to SMTP do not re-send the code while the existing challenge is still
active.

## Changed files/components

- `src/gateways/notify/gateway.ts`
- `src/gateways/notify/bootstrap.ts`
- `src/gateways/tfa/bootstrap.ts`
- `src/gateways/tfa/gateway.ts`
- `src/gateways/tfa/ui/login-flow.js`
- `src/gateways/tfa/ui/languages/*/strings.xml`
- `src/gateways/tfa/tests/login-flow-ui.test.js`
- `src/gateways/tfa/tests/tfa-gateway.test.ts`
- `src/gateways/tfa/manifest.json`
- `src/adapters/notify/smtp/smtp-notification-sender.ts`
- `src/adapters/tfa/smtp/index.ts`
- `src/gateways/notify/tests/notification-gateway.test.ts`
- `src/adapters/notify/smtp/tests/smtp-notification-sender.test.ts`
- `src/adapters/tfa/smtp/tests/smtp-adapter.test.ts`
- `src/docs/versions.en.md`

## Commits

- [460f399](https://github.com/Cognis-Labs-HQ/Cognis/commit/460f399ae3701867d002e0006d3a71a7dbf9e3c8)
