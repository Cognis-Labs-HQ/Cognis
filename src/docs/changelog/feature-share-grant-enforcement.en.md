# Share Access and Translations

**Feature Branch:** feature-share-grant-enforcement

## Enforce expiry at access checks

Direct user shares stop granting access at expiry, including password-unlocked shares retained for history. An empty expiry remains unlimited; malformed nonempty expiry values deny access.

## Honor explicit grant revocation

PATCH with `grantedCapabilities: []` removes every granted capability. Omitting the field preserves grants; a nonempty array replaces them. Recipient, password and adapter checks remain in force.

## Translation Catalogs

Keyring catalogs use the runtime XML root so guest Share URLs can create their temporary keyring without a missing-translation failure. Missing labels in room-key prompts, reactions, calendar series editing, email actions, notification controls, SSO callbacks and Administration status are supplied in all four languages. Catalog-root and literal-reference checks prevent the same omissions in other components.

## Commits

- [37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a](https://github.com/Cognis-Labs-HQ/Cognis/commit/37279a34a3891cca73dbc5cc5c85f3b00b2b2e8a)
- [5244359630d1cdc12910d11cfb9d20e2c916fbf0](https://github.com/Cognis-Labs-HQ/Cognis/commit/5244359630d1cdc12910d11cfb9d20e2c916fbf0)
- [d18f6f0a62926c095df90a4cd6c15f9484f287b4](https://github.com/Cognis-Labs-HQ/Cognis/commit/d18f6f0a62926c095df90a4cd6c15f9484f287b4)
