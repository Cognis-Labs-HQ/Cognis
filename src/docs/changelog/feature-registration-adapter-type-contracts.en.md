# Typed Provider Contracts

**Feature Branch:** feature-registration-adapter-type-contracts

## Typed Provider Contracts

Registration forwards the complete invitation input, including optional email, through its provider contract. Public registration requires the account registration operation; token registration also requires account lookup and deletion. LDAP exposes its directory and credential test result shapes and uses the supported paged-search options. Local account details include role and provider. TOTP declares only its used promise-based SVG QR renderer. Authentication, invitation authorization and TOTP verification rules are unchanged.

## Documentation and Test Scope

Registration documentation includes public-capability examples and technical contracts. Token adapter test fixtures stay beside their sole consuming test.

## Commits

- [456b614a57720e842f2e093e9290ad992717ac86](https://github.com/Cognis-Labs-HQ/Cognis/commit/456b614a57720e842f2e093e9290ad992717ac86)
- [84aa63eb64831bb04ad211e366fa5dec8f2b713e](https://github.com/Cognis-Labs-HQ/Cognis/commit/84aa63eb64831bb04ad211e366fa5dec8f2b713e)
