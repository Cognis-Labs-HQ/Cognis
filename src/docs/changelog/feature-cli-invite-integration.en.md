# CLI Invitation Delivery

**Feature Branch:** feature-cli-invite-integration

## Generate tokens without email

The registration token command now requests manual delivery using the current registration API contract. It accepts no email argument and returns a registration link without sending email. The email invitation command explicitly requests email delivery. Existing authorization and domain restrictions still apply.

## Verify command outcomes

Route-backed tests cover anonymous and email-bound issuance, rejected input, authorization failures, domain restrictions, and deliberate link output without link leakage into logs. CLI version 0.4.3 includes Registration Token adapter 0.1.42. Returned links are secrets; use verbose output when a summary abbreviates a link.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/b460321c4fa15861829de7ca1502cfa9bdfc18a9
