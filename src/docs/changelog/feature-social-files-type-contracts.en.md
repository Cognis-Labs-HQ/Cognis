# Typed Social Contracts

**Feature Branch:** feature-social-files-type-contracts

## Typed Storage and Routes

Social profile roles and visibility declarations now match stored records. Messages and profile routes retain their authorization checks while their callbacks, notification envelopes and database commands use explicit contracts. Missing guest-session resolution still fails before a guest profile is read.

## Isolated Contract Tests

Profile persistence tests use a component-owned structured database fixture with transactions. Membership-denial tests cover guests and nonmembers. Files ACL tests supply the calling component explicitly; namespace identity and access rules are unchanged.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/ff7f3932e04aa47722da1841f1a891c550f240e2
