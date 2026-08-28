# Exclude Admins from Invites

## Summary

Updated the registration navbar Invite-menu visibility rule so founder users with admin-equivalent access do not see the Invite entry.

Admins and owners already have invite management through the Users page, so the Invite quick-link now remains limited to non-admin founders only.

## Changed Files / Components

- `src/gateways/registration/ui/navbar.js` — Added admin-role normalization (`admin` and `owner`) and used it in the Invite-menu visibility gate.
- `src/gateways/registration/tests/navbar.test.js` — Added regression coverage that locks admin-equivalent founder exclusion for the Invite menu.
- `src/gateways/registration/bootstrap.ts`, `src/gateways/registration/manifest.json`, and `src/docs/versions.en.md` — Bumped the Registration gateway component version to `1.1.7`.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/041fdb8
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d47ee73
