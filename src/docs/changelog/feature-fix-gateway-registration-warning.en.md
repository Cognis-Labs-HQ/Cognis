# Valid Dependency UUIDs

**Feature Branch:** feature-fix-gateway-registration-warning

## Component dependencies resolve correctly

Registration now declares only gateway dependencies, eliminating its startup warning. The Social Messages adapter now references the installed Social Profile adapter UUID.

## Dependency validation prevents regressions

Architecture checks now reject dependency UUIDs that do not identify an installed component and reject adapter UUIDs in gateway dependency lists.

## Commits

- [6fa7e14](https://github.com/Cognis-Labs-HQ/Cognis/commit/6fa7e1466a06e62c23cf4905d680fa3aa1bf7768)
