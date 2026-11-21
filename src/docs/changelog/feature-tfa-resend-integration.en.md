# TFA Resend Feedback

**Feature Branch:** feature-tfa-resend-integration

## Explain each resend result

An expired login now explains how to start again. Other rejected or uncertain resend results show a localized error instead of silently returning to the resend link. Valid method responses without a delivery receipt show neutral feedback rather than claiming an email was sent.

## Keep cooldown ownership

Authoritative deadlines, pending-request locks and explicit retries are preserved. Malformed successful responses retain the issued code constraints. No automatic resend, server-policy change or delivery guarantee is introduced.

## Preserve result ownership

Account and session changes stop old resend actions and feedback. Missing required translations remain explicit errors instead of being replaced by another message.

## Release abandoned prompt resources

Leaving, replacing or successfully cancelling Login now removes resend listeners and timers immediately, without waiting for a pending request. Failed cancellation keeps the current prompt usable. Disposing the UI does not promise to undo a sent request.

## Keep interrupted resends recoverable

Pending resends now show a localized busy label. Failed cancellation restores the settled result and remaining server deadline without automatic retries. Auth 2.2.14 and TFA 1.3.14 require the same versioned browser lifetime contract; deploy their JavaScript and assets together and reload older Login tabs.

## Show each resend receipt once

Returning to a method shows each completed resend receipt once; switching away and back again does not repeat it.

## Commits

- [1b9d020c3d8820e1b5838fbd4c54e51e626fbd1f](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b9d020c3d8820e1b5838fbd4c54e51e626fbd1f)
- [f3f810aa71ab0bbd7bdcb841be01ee5979834239](https://github.com/Cognis-Labs-HQ/Cognis/commit/f3f810aa71ab0bbd7bdcb841be01ee5979834239)
- [d43180248e4feb9d580f1fe7ce532c9dd7a6fbf6](https://github.com/Cognis-Labs-HQ/Cognis/commit/d43180248e4feb9d580f1fe7ce532c9dd7a6fbf6)
- [6fcc59f6db105cc068acb34e57837f7d14e66519](https://github.com/Cognis-Labs-HQ/Cognis/commit/6fcc59f6db105cc068acb34e57837f7d14e66519)
- [485f7e727dc7fffc158bad34a0f7ccec4dd4174e](https://github.com/Cognis-Labs-HQ/Cognis/commit/485f7e727dc7fffc158bad34a0f7ccec4dd4174e)
- [e77f2d78c6848e25688eea11a014c5f5294b2387](https://github.com/Cognis-Labs-HQ/Cognis/commit/e77f2d78c6848e25688eea11a014c5f5294b2387)
