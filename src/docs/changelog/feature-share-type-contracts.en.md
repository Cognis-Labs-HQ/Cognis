# Typed Share Contracts

**Feature Branch:** feature-share-type-contracts

## Typed Token Results

Share 1.9.9 declares the token fields returned by issue, update and list capabilities, including metadata, expiry, recipients and granted capabilities. Bootstrap callbacks and structured query fixtures use explicit contracts. Owner checks and explicit empty capability revocation remain enforced.

## Tests and Security

Synthetic tests exercise persisted token results, denied owner updates and guest profile cleanup. Recipient, password, adapter and expiry checks retain their existing behavior.

## Commits

- [f8c570ec93b88599220fcbf1ec5b18d617e01136](https://github.com/Cognis-Labs-HQ/Cognis/commit/f8c570ec93b88599220fcbf1ec5b18d617e01136)
