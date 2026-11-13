# Typed Share Contracts

**Feature Branch:** feature-share-type-contracts

## Typed Token Results

Share 1.9.9 declares the token fields returned by issue, update and list capabilities, including metadata, expiry, recipients and granted capabilities. Bootstrap callbacks and structured query fixtures use explicit contracts. Owner checks and explicit empty capability revocation remain enforced.

## Tests and Security

Synthetic tests exercise persisted token results, denied owner updates and guest profile cleanup. Recipient, password, adapter and expiry checks retain their existing behavior.

## Commits

- [c8aaf647458133c3c7d6dfd807ed63563bbb682f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c8aaf647458133c3c7d6dfd807ed63563bbb682f)
