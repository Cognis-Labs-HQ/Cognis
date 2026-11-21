# Typed Provider Contracts

**Feature Branch:** feature-registration-adapter-type-contracts

## Typed Provider Contracts

Registration forwards the complete invitation input, including optional email, through its provider contract. Public registration requires the account registration operation; token registration also requires account lookup and deletion. LDAP exposes its directory and credential test result shapes and uses the supported paged-search options. Local account details include role and provider. TOTP declares only its used promise-based SVG QR renderer. Authentication, invitation authorization and TOTP verification rules are unchanged.

## Documentation and Test Scope

Registration documentation includes public-capability examples and technical contracts. Token adapter test fixtures stay beside their sole consuming test.

## Commits

- [471c1b5aa070b5a955dab7afc7eb47b91787c3a1](https://github.com/Cognis-Labs-HQ/Cognis/commit/471c1b5aa070b5a955dab7afc7eb47b91787c3a1)
- [8ce0f9aaab0b162a8462b20a99fa4ed27cb04487](https://github.com/Cognis-Labs-HQ/Cognis/commit/8ce0f9aaab0b162a8462b20a99fa4ed27cb04487)
- [82e9aaada9162eabefb033f5bde05fbf349a6f82](https://github.com/Cognis-Labs-HQ/Cognis/commit/82e9aaada9162eabefb033f5bde05fbf349a6f82)
