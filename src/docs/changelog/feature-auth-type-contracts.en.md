# Authentication Type Contracts

**Feature Branch:** feature-auth-type-contracts

## Typed Authentication Boundaries

Auth and TFA declarations now describe the existing account roles, external identity fields, database commands and cookie session projections. Session timeout validation retains the same accepted numeric values. Login assurance and single-use factor attempts remain unchanged.

## Faithful Component Tests

Authentication fixtures use the real structured database contract and registered flow stages. HTTP route tests pass their declared request metadata and retain rejection, persistence and lifecycle assertions. Full-source checking includes production and test files.

## Commits

- [508c168554a68c00fa4493768788df625f03abe6](https://github.com/Cognis-Labs-HQ/Cognis/commit/508c168554a68c00fa4493768788df625f03abe6)
