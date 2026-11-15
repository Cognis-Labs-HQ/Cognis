# Profile Confirmations

**Feature Branch:** feature-profile-confirmation-integration

## Confirm Profile Actions

Delete, Unfollow and Block now use destructive confirmation buttons and a neutral Cancel that preserves the current content or relationship. Unblock uses a neutral action. Repeated actions share one pending decision and request. Navigation, account or session changes and provider removal revoke old controls.

## Recover With Clear Feedback

Rejected and known-unsent actions show an error and permit a new confirmation. Uncertain delivery is not repeated on the current page; reopen the profile to check the result. Accepted changes remain accepted if a subsequent view refresh fails.

## Shared Queue Cancellation

A page cancellation now reaches the shared request and durable-buffer boundaries before submission. The optional delivery and outbox signal contracts preserve accepted records, existing no-signal calls and replay. Ship the shared UI assets with Profile 4.0.1.

## Commits

- [ba47b044fa05c39695814c073c60890075b16cbe](https://github.com/Cognis-Labs-HQ/Cognis/commit/ba47b044fa05c39695814c073c60890075b16cbe)
- [e99a5c36fa180248c9909c44bf4b012324a9b3aa](https://github.com/Cognis-Labs-HQ/Cognis/commit/e99a5c36fa180248c9909c44bf4b012324a9b3aa)
