# Keep Share Errors on the Share Page

**Feature Branch:** `work`

## Show Share Access Errors Instead of Session Expiry

Access failures raised while viewing shared meeting content are now claimed by the Share gateway before the account session-expiry watcher responds. When a host closes a meeting or a shared resource otherwise becomes unavailable, guests see the relevant share error instead of being redirected by account-session recovery.

## Commits

- [bdcaabbc](https://github.com/Cognis-Labs-HQ/Cognis/commit/bdcaabbc)
