# CLI Invitation Delivery

**Feature Branch:** feature-cli-invite-integration

## Generate tokens without email

The registration token command now requests manual delivery using the current registration API contract. It accepts no email argument and returns a registration link without sending email. The email invitation command explicitly requests email delivery. Existing authorization and domain restrictions still apply.

## Verify command outcomes

Route-backed tests cover anonymous and email-bound issuance, rejected input, authorization failures, domain restrictions, and deliberate link output without link leakage into logs. CLI version 0.4.3 includes Registration Token adapter 0.1.42. Returned links are secrets; use verbose output when a summary abbreviates a link.

## Commits

- [1201af1d19a0b9efa96d59d9f292771cb9f6cc0b](https://github.com/Cognis-Labs-HQ/Cognis/commit/1201af1d19a0b9efa96d59d9f292771cb9f6cc0b)
