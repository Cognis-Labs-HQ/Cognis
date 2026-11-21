# Administration Saves

**Feature Branch:** feature-administration-security-save

## Administration Saves

Administration saves only sections with pending changes. Security controls become editable after both security settings and password policy load successfully. A form redraw preserves pending edits; leaving a changed section still requires the existing discard confirmation. A partial save keeps failed or newer edits pending, so retry does not resend settings already saved. The Security tutorial continues to explain session policy and trusted domains.

## Translation Recovery

Connection recovery invalidates core and component translation snapshots before pages redraw. Explicit bundle refreshes fetch current server content while retaining complete offline snapshots during outages. Non-resource XML responses fail validation and are evicted so a subsequent load can recover without a hard refresh.

## Commits

- [5670661ce549fca1766d385fdfcb157114365b6d](https://github.com/Cognis-Labs-HQ/Cognis/commit/5670661ce549fca1766d385fdfcb157114365b6d)
- [bce901458c323767adc2321ac3b5d1a1146c95c7](https://github.com/Cognis-Labs-HQ/Cognis/commit/bce901458c323767adc2321ac3b5d1a1146c95c7)
