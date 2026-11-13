# Reliable Module Updates

**Feature Branch:** feature-investigate-module-update-failure

## Removed channels recover safely

When an installed release channel has been deleted, a marketplace scan now moves the available update target to the repository's default branch instead of retaining an unusable cached channel. The module can then be updated normally.

## Validation failures are clear

Module enable validation failures now return a safe, structured API error. Administration shows a translated validation-failed toast and directs operators to the server log instead of displaying a generic request failure.

## Commits

- [dd9dbd5](https://github.com/Cognis-Labs-HQ/Cognis/commit/dd9dbd55d239ace38a65225c05d67b40c4c2f2fd)
