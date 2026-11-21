# Share Grant Enforcement

**Feature Branch:** feature-share-grant-enforcement

## Enforce expiry at access checks

Direct user shares stop granting access at expiry, including password-unlocked shares retained for history. An empty expiry remains unlimited; malformed nonempty expiry values deny access.

## Honor explicit grant revocation

PATCH with `grantedCapabilities: []` removes every granted capability. Omitting the field preserves grants; a nonempty array replaces them. Recipient, password and adapter checks remain in force.

## Commits

- [1f5c4f101876d150f9ee130a00297fbb266d4399](https://github.com/Cognis-Labs-HQ/Cognis/commit/1f5c4f101876d150f9ee130a00297fbb266d4399)
- [bb1d6a4e69171f0abfe3792028a9137855224315](https://github.com/Cognis-Labs-HQ/Cognis/commit/bb1d6a4e69171f0abfe3792028a9137855224315)
- [05885663480dbd75b40b8fa5b5ea29faeb156fed](https://github.com/Cognis-Labs-HQ/Cognis/commit/05885663480dbd75b40b8fa5b5ea29faeb156fed)
