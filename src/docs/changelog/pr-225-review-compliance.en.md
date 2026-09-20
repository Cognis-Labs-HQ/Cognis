# PR 225 Review Compliance

**Feature Branch:** pr-225-review-compliance

## Safer External Accounts

External account creation now preserves provider boundaries when deriving account names, uses a validated adapter namespace when provider labels are unsuitable, and rolls back failed registration commits without marking the authenticated identity as deliberately deleted.

## Correct Form Semantics

Required radio groups now remain invalid until an option is selected, and profile synchronization uses destructive-action styling because it may replace profile data.

## Version Compliance

The API contract and every affected component now publish aligned versions and tested dependency ceilings. Authentication orchestration was also split into reviewable source files, and provider-scoped LDAP administration tests now use canonical account names.

## Commits

- [6e3830656f89213880dbcb4429ff44239f2c2bbf](https://github.com/Cognis-Labs-HQ/Cognis/commit/6e3830656f89213880dbcb4429ff44239f2c2bbf)
