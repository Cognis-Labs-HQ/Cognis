# Username & Password Policy

**Feature Branch:** copilot/make-usernames-case-insensitive

## Usernames are now case-insensitive and ASCII-only

Usernames are normalized to lowercase on registration and login. Only printable ASCII characters are allowed, and the maximum length is 25 characters. Invalid usernames are rejected at the API boundary with clear error codes.

## Password policy configurable in Administration → Security

Administrators can now set a password policy under Administration → Security. The configurable criteria are: minimum length, require uppercase letter, require lowercase letter, require digit, and require special character. The policy applies to both registration and password changes.

## Live password criteria check on registration and password reset

During registration, the password field shows live inline feedback as you type, indicating which policy criteria your password does not yet satisfy. The confirm password field shows an exclamation message in real time if the passwords do not match.

## Reusable criteria-check module

A new `attachCriteriaCheck` function in `src/ui/reuse/criteria-check.js` provides flexible, accessible live validation for any form field. Each criterion can supply its own failure message; a configurable generic message is used as a fallback.

## Commits

- [2c806b8](https://github.com/Cognis-Labs-HQ/Cognis/commit/2c806b81e4aef343918c7dfa36cdf6d7a2191802)
