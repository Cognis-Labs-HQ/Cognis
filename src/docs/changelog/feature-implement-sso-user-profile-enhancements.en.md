# External Profile Enhancements

**Feature Branch:** feature-implement-sso-user-profile-enhancements

## Stable External Accounts

External identities resolve to one canonical, provider-scoped local account before registration, persistence, token issuance, and profile creation. Resolved handles keep accounts such as `x:firehawksystems`, `line:firehawksystems`, and the local `firehawksystems` distinct.

## Safe Identity Lifecycle

Deleting an external account records a one-way identity fingerprint before removing account data. A later successful provider authentication can clear that deletion record transactionally while recreating the provider-scoped account, while failed authentication and failed registration commits cannot alter its deletion state.

## Provider Profile Experience

Administration displays resolved handles and provider icons for external accounts. Users can request a provider profile refresh from the profile banner, and Cognis persists returned profile media rather than repeatedly loading remote images.

## Provider Profile Visibility

External authentication sessions and resolved profiles can return `profileVisibility`. Cognis validates supported values and persists the requested visibility after profile creation or synchronization.

## Clear Module Setup

Modules can declare localized activation guidance with adapter targets. After enablement, Cognis presents provider-neutral next steps and can take administrators directly to the relevant Administration area.

## Better Registration Controls

Administration presents registration and invitation policies as compact Yes or No radio groups. The shared form composer and dirty tracker consistently manage saving and discarding, while required radio groups remain invalid until selected.

## Provider Sync Isolation

External profile synchronization is registered per provider, so Cognis only offers and invokes synchronization for the provider that authenticated the current account. Replaced avatar and banner object URLs are revoked to avoid retaining stale media in browser memory.

## Compliance and Safety

Account namespaces are validated before lookup, failed account-creation rollbacks do not create deletion tombstones, profile synchronization uses destructive-action styling, and affected component versions and dependency ceilings remain aligned.

## Commits

- [e852d7df7c3eef240000095422fafdad6d716042](https://github.com/Cognis-Labs-HQ/Cognis/commit/e852d7df7c3eef240000095422fafdad6d716042)
- [69ba80376c9eee932299c8ae9f49f86819f77a0d](https://github.com/Cognis-Labs-HQ/Cognis/commit/69ba80376c9eee932299c8ae9f49f86819f77a0d)
- [dac7a3c55115a645ca04a63d7a336e88c69c7673](https://github.com/Cognis-Labs-HQ/Cognis/commit/dac7a3c55115a645ca04a63d7a336e88c69c7673)
- [3691212d5088e503900b8a9f3aab8c6c1f375840](https://github.com/Cognis-Labs-HQ/Cognis/commit/3691212d5088e503900b8a9f3aab8c6c1f375840)
- [72389da57f5713401c14521893e8f0f1c540cfc7](https://github.com/Cognis-Labs-HQ/Cognis/commit/72389da57f5713401c14521893e8f0f1c540cfc7)
- [bbc6a9937ec55eb7959d2f788976bee62c222a86](https://github.com/Cognis-Labs-HQ/Cognis/commit/bbc6a9937ec55eb7959d2f788976bee62c222a86)
- [5282575c57d00af6665f5c2d4ae3a9e265b870da](https://github.com/Cognis-Labs-HQ/Cognis/commit/5282575c57d00af6665f5c2d4ae3a9e265b870da)
- [d758074ac7dae7bfaaebf4dfd956096a6679e566](https://github.com/Cognis-Labs-HQ/Cognis/commit/d758074ac7dae7bfaaebf4dfd956096a6679e566)
- [6e3830656f89213880dbcb4429ff44239f2c2bbf](https://github.com/Cognis-Labs-HQ/Cognis/commit/6e3830656f89213880dbcb4429ff44239f2c2bbf)
- [b7423a46e20c3a4cc795eebc3ff4aa765ede7fa4](https://github.com/Cognis-Labs-HQ/Cognis/commit/b7423a46e20c3a4cc795eebc3ff4aa765ede7fa4)
- [fbbbfda628ce7aed65235b1b071b921c906dd79d](https://github.com/Cognis-Labs-HQ/Cognis/commit/fbbbfda628ce7aed65235b1b071b921c906dd79d)
- [c5a50d8d4728d861e69a72e840da64ec64850b82](https://github.com/Cognis-Labs-HQ/Cognis/commit/c5a50d8d4728d861e69a72e840da64ec64850b82)
