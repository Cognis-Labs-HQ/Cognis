# Keep Share Errors on the Share Page

**Feature Branch:** `feature-fix-meeting-closure-break-and-share-error-handling`

## Show Share Access Errors Instead of Session Expiry

Access failures raised while viewing shared meeting content are now claimed by the Share gateway before the account session-expiry watcher responds. When a host closes a meeting or a shared resource otherwise becomes unavailable, guests see the relevant share error instead of being redirected by account-session recovery.

## Redirect Removed Meeting Shares to 404

When meeting cleanup removes an active share, the share status monitor now stops polling and sends the guest directly to the public 404 page without attempting to resolve the deleted share again.

## Commits

- [bdcaabbc](https://github.com/Cognis-Labs-HQ/Cognis/commit/bdcaabbc)
- [3210a324](https://github.com/Cognis-Labs-HQ/Cognis/commit/3210a324)
