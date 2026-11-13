# Authentication Type Contracts

**Feature Branch:** feature-auth-type-contracts

## Typed Authentication Boundaries

Auth and TFA declarations now describe the existing account roles, external identity fields, database commands and cookie session projections. Session timeout validation retains the same accepted numeric values. Login assurance and single-use factor attempts remain unchanged.

## Faithful Component Tests

Authentication fixtures use the real structured database contract and registered flow stages. HTTP route tests pass their declared request metadata and retain rejection, persistence and lifecycle assertions. Full-source checking includes production and test files.

## Commits

- [f953a13e8b8ec88c0907be13cc1891c0800ff25d](https://github.com/Cognis-Labs-HQ/Cognis/commit/f953a13e8b8ec88c0907be13cc1891c0800ff25d)
