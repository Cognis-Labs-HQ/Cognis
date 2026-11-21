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

- [18941c4346a32e691be8e802350d279fac42d98a](https://github.com/Cognis-Labs-HQ/Cognis/commit/18941c4346a32e691be8e802350d279fac42d98a)
- [72160829fb76bd59c0b725e936abb4e6f29fcb8d](https://github.com/Cognis-Labs-HQ/Cognis/commit/72160829fb76bd59c0b725e936abb4e6f29fcb8d)
