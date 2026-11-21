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

- [3c14073f0afcd5692c3fe79436c29c2bc070a56f](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c14073f0afcd5692c3fe79436c29c2bc070a56f)
- [1a16d312a9c6f8beabb292d5514252b8ef85ca4c](https://github.com/Cognis-Labs-HQ/Cognis/commit/1a16d312a9c6f8beabb292d5514252b8ef85ca4c)
- [104bba557f1a537d2e12bc49731bc82f0c432d6a](https://github.com/Cognis-Labs-HQ/Cognis/commit/104bba557f1a537d2e12bc49731bc82f0c432d6a)
- [ec94ee0541bca4e35be17f88b834c29c8c373300](https://github.com/Cognis-Labs-HQ/Cognis/commit/ec94ee0541bca4e35be17f88b834c29c8c373300)
- [5761ff70e99a8cf914105180a9ecc9d58b95f6a8](https://github.com/Cognis-Labs-HQ/Cognis/commit/5761ff70e99a8cf914105180a9ecc9d58b95f6a8)
- [3f45fbb17e189c84904274bdda0509188db8ee6a](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f45fbb17e189c84904274bdda0509188db8ee6a)
