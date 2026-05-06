# ACL Matrix

## Overview

The ACL matrix defines which actions each role may perform in Cognis. Roles are assigned at account creation or by an admin after the fact; self-registration always produces the `user` role. There is no self-service role escalation.

Cognis has four roles. `user` is the default granted on registration and covers all standard learner activity. `teacher` grants access to instructor-specific APIs and is assigned by an admin. `moderator` adds community moderation rights (deleting any post) but has no access to system configuration. `admin` has full platform access and is the only role that can manage auth providers, install modules, configure file limits, and access system diagnostics.

## Responsibilities

- Define the authoritative set of roles and the actions each role may take.
- Serve as the reference document for contributors implementing new protected endpoints.

Not responsible for: enforcement (that lives in `requireAuth` in `src/api/auth/guard.ts` and in route-level admin checks throughout the route handlers).

## Architecture

Role checks are enforced in two places:

- **`requireAuth(req, res, role?)`** in `src/api/auth/guard.ts` — validates the bearer token and optionally asserts a minimum role. All protected routes call this before any business logic.
- **Admin-specific checks** — routes that require admin access call `requireAuth(req, res, 'admin')`. Moderator-level checks (e.g. delete any post) are inline in the relevant route handler.

Role values are embedded in the access token at issuance in `src/api/auth/access-tokens.ts`. The resolved role comes from the account record at login time; the auth gateway's `resolveRole` function maps provider-specific role signals (e.g. `isAdmin: true` from an LDAP group) to the Cognis role set.

## Role matrix

| Capability | user | teacher | moderator | admin |
| ----------------------------------------- | ---: | ------: | --------: | ----: |
| Self-register | ✅ | ✅ | ✅ | ✅ |
| View/edit own profile | ✅ | ✅ | ✅ | ✅ |
| Upload own avatar / banner | ✅ | ✅ | ✅ | ✅ |
| Create posts (when not hidden) | ✅ | ✅ | ✅ | ✅ |
| Follow / unfollow users | ✅ | ✅ | ✅ | ✅ |
| Block / unblock users | ✅ | ✅ | ✅ | ✅ |
| Upload / download files | ✅ | ✅ | ✅ | ✅ |
| View learning content | ✅ | ✅ | ✅ | ✅ |
| Submit content for review | ✅ | ✅ | ✅ | ✅ |
| Access teacher-specific APIs | ❌ | ✅ | ❌ | ✅ |
| Delete any user's post | ❌ | ❌ | ✅ | ✅ |
| Delete arbitrary files | ❌ | ❌ | ❌ | ✅ |
| View any profile regardless of visibility | ❌ | ❌ | ❌ | ✅ |
| Configure file size limits | ❌ | ❌ | ❌ | ✅ |
| Review / approve global content | ❌ | ❌ | ❌ | ✅ |
| Install module (zip) | ❌ | ❌ | ❌ | ✅ |
| Enable / disable non-core module | ❌ | ❌ | ❌ | ✅ |
| Toggle core module | ❌ | ❌ | ❌ | ❌ |
| Manage auth provider config | ❌ | ❌ | ❌ | ✅ |
| System diagnostics endpoints | ❌ | ❌ | ❌ | ✅ |

## Role notes

- **user** — default role granted on self-registration; equivalent to the student role for all platform purposes.
- **teacher** — elevated API access for instructor features; granted by an admin at account creation or via `user:role`; not self-assignable.
- **moderator** — community moderation rights (delete any post); no access to system or admin configuration.
- **admin** — full platform access; admin accounts are created out-of-band via `cognisctl user:create` or the bootstrap process; self-registration always issues `user`.
