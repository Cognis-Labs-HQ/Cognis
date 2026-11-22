# Typed Social Contracts

**Feature Branch:** feature-social-files-type-contracts

## Typed Storage and Routes

Social profile roles and visibility declarations now match stored records. Messages and profile routes retain their authorization checks while their callbacks, notification envelopes and database commands use explicit contracts. Missing guest-session resolution still fails before a guest profile is read.

## Isolated Contract Tests

Profile persistence tests use a component-owned structured database fixture with transactions. Membership-denial tests cover guests and nonmembers. Files ACL tests supply the calling component explicitly; namespace identity and access rules are unchanged.

## Commits

- [2e913c2810feec19fb4c08ead1c01fd2335a046f](https://github.com/Cognis-Labs-HQ/Cognis/commit/2e913c2810feec19fb4c08ead1c01fd2335a046f)
- [dc8cc7ab0a27286fbed63e53637c73a0ce5878d3](https://github.com/Cognis-Labs-HQ/Cognis/commit/dc8cc7ab0a27286fbed63e53637c73a0ce5878d3)
- [103bf368dd7f8931da2681a838e01e2d9980a4c2](https://github.com/Cognis-Labs-HQ/Cognis/commit/103bf368dd7f8931da2681a838e01e2d9980a4c2)
