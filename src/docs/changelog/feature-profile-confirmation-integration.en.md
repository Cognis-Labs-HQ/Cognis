# Profile Confirmations

**Feature Branch:** feature-profile-confirmation-integration

## Confirm Profile Actions

Delete, Unfollow and Block now use destructive confirmation buttons and a neutral Cancel that preserves the current content or relationship. Unblock uses a neutral action. Repeated actions share one pending decision and request. Navigation, account or session changes and provider removal revoke old controls.

## Recover With Clear Feedback

Rejected and known-unsent actions show an error and permit a new confirmation. Uncertain delivery is not repeated on the current page; reopen the profile to check the result. Accepted changes remain accepted if a subsequent view refresh fails.

## Shared Queue Cancellation

A page cancellation now reaches the shared request and durable-buffer boundaries before submission. The optional delivery and outbox signal contracts preserve accepted records, existing no-signal calls and replay. Ship the shared UI assets with Profile 4.0.1.

## Commits

- [447e2ef705547e9e4f42ead1ef49574752b80c10](https://github.com/Cognis-Labs-HQ/Cognis/commit/447e2ef705547e9e4f42ead1ef49574752b80c10)
- [cc32cb6dd56ee033cdcb869d405ee2cb479d6611](https://github.com/Cognis-Labs-HQ/Cognis/commit/cc32cb6dd56ee033cdcb869d405ee2cb479d6611)
