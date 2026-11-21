# Authentication Type Contracts

**Feature Branch:** feature-auth-type-contracts

## Typed Authentication Boundaries

Auth and TFA declarations now describe the existing account roles, external identity fields, database commands and cookie session projections. Session timeout validation retains the same accepted numeric values. Login assurance and single-use factor attempts remain unchanged.

## Faithful Component Tests

Authentication fixtures use the real structured database contract and registered flow stages. HTTP route tests pass their declared request metadata and retain rejection, persistence and lifecycle assertions. Full-source checking includes production and test files.

## Commits

- [111678dc84dee7c6d9bfcfbe83583b4c68f19392](https://github.com/Cognis-Labs-HQ/Cognis/commit/111678dc84dee7c6d9bfcfbe83583b4c68f19392)
- [c4f6ddf9f21a744f7d9133292f614e98467d829f](https://github.com/Cognis-Labs-HQ/Cognis/commit/c4f6ddf9f21a744f7d9133292f614e98467d829f)
- [be83c1b8857ed540915606f4477053f3f54b933a](https://github.com/Cognis-Labs-HQ/Cognis/commit/be83c1b8857ed540915606f4477053f3f54b933a)
