# Typed Social Contracts

**Feature Branch:** feature-social-files-type-contracts

## Typed Storage and Routes

Social profile roles and visibility declarations now match stored records. Messages and profile routes retain their authorization checks while their callbacks, notification envelopes and database commands use explicit contracts. Missing guest-session resolution still fails before a guest profile is read.

## Isolated Contract Tests

Profile persistence tests use a component-owned structured database fixture with transactions. Membership-denial tests cover guests and nonmembers. Files ACL tests supply the calling component explicitly; namespace identity and access rules are unchanged.

## Commits

- [4c9af91f2455a5551bd1ef8474a0476c7cc962d9](https://github.com/Cognis-Labs-HQ/Cognis/commit/4c9af91f2455a5551bd1ef8474a0476c7cc962d9)
- [c226a2ba265d8c855a33889ac8a47ef3cc1a9399](https://github.com/Cognis-Labs-HQ/Cognis/commit/c226a2ba265d8c855a33889ac8a47ef3cc1a9399)
