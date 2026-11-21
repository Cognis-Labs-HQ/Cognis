# Typed Share Contracts

**Feature Branch:** feature-share-type-contracts

## Typed Token Results

Share 1.9.9 declares the token fields returned by issue, update and list capabilities, including metadata, expiry, recipients and granted capabilities. Bootstrap callbacks and structured query fixtures use explicit contracts. Owner checks and explicit empty capability revocation remain enforced.

## Tests and Security

Synthetic tests exercise persisted token results, denied owner updates and guest profile cleanup. Recipient, password, adapter and expiry checks retain their existing behavior.

## Commits

- [411baf079785e6e470970301216f37c7b73fceba](https://github.com/Cognis-Labs-HQ/Cognis/commit/411baf079785e6e470970301216f37c7b73fceba)
- [4b940788bcf224e9e93de8f4c1557ea8eef418c0](https://github.com/Cognis-Labs-HQ/Cognis/commit/4b940788bcf224e9e93de8f4c1557ea8eef418c0)
