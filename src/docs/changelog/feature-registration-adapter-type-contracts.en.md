# Typed Provider Contracts

**Feature Branch:** feature-registration-adapter-type-contracts

## Typed Provider Contracts

Registration forwards the complete invitation input, including optional email, through its provider contract. Public registration requires the account registration operation; token registration also requires account lookup and deletion. LDAP exposes its directory and credential test result shapes and uses the supported paged-search options. Local account details include role and provider. TOTP declares only its used promise-based SVG QR renderer. Authentication, invitation authorization and TOTP verification rules are unchanged.

## Documentation and Test Scope

Registration documentation includes public-capability examples and technical contracts. Token adapter test fixtures stay beside their sole consuming test.

## Commits

- [0a07f8f619aa74e0b49cbae0ebe6489c5a6b0f2b](https://github.com/Cognis-Labs-HQ/Cognis/commit/0a07f8f619aa74e0b49cbae0ebe6489c5a6b0f2b)
- [4017b8fb74d855ef203f1588bdea7bea648e215d](https://github.com/Cognis-Labs-HQ/Cognis/commit/4017b8fb74d855ef203f1588bdea7bea648e215d)
