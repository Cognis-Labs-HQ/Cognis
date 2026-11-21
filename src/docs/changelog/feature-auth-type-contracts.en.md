# Authentication Type Contracts

**Feature Branch:** feature-auth-type-contracts

## Typed Authentication Boundaries

Auth and TFA declarations now describe the existing account roles, external identity fields, database commands and cookie session projections. Session timeout validation retains the same accepted numeric values. Login assurance and single-use factor attempts remain unchanged.

## Faithful Component Tests

Authentication fixtures use the real structured database contract and registered flow stages. HTTP route tests pass their declared request metadata and retain rejection, persistence and lifecycle assertions. Full-source checking includes production and test files.

## Commits

- [f731cb62ccf6b430a3b33b082d4e083157158a83](https://github.com/Cognis-Labs-HQ/Cognis/commit/f731cb62ccf6b430a3b33b082d4e083157158a83)
- [ada8231e5710e9eb57aba6d695c020038016339f](https://github.com/Cognis-Labs-HQ/Cognis/commit/ada8231e5710e9eb57aba6d695c020038016339f)
