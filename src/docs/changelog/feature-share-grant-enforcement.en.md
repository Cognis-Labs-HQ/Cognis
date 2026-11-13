# Share Grant Enforcement

**Feature Branch:** feature-share-grant-enforcement

## Enforce expiry at access checks

Direct user shares stop granting access at expiry, including password-unlocked shares retained for history. An empty expiry remains unlimited; malformed nonempty expiry values deny access.

## Honor explicit grant revocation

PATCH with `grantedCapabilities: []` removes every granted capability. Omitting the field preserves grants; a nonempty array replaces them. Recipient, password and adapter checks remain in force.

## Commits

- [c9025184029351f2da09709c5fa525486ae2d5f7](https://github.com/Cognis-Labs-HQ/Cognis/commit/c9025184029351f2da09709c5fa525486ae2d5f7)
