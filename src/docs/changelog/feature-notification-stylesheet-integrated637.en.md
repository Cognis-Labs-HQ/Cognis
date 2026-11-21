# Notification Style Recovery

**Feature Branch:** feature-notification-stylesheet-integrated637

## Recover styling after failure

Internal Notifications shares one stylesheet attempt with a five-second deadline. Errors and timeouts leave the inbox available with a localized warning; a later provider mount can request a fresh stylesheet. Cancellation preserves other waiters and healthy external styles, and late results cannot revive a retired provider.

## Keep existing inbox behavior

Notification actions, polling, arrival lifetimes and the workspace tutorial remain unchanged. Internal Notification Adapter is now version 0.5.38.

## Commits

- [13ef351a6b5c00b5fdb3b8493b931c2bf2aedd23](https://github.com/Cognis-Labs-HQ/Cognis/commit/13ef351a6b5c00b5fdb3b8493b931c2bf2aedd23)
