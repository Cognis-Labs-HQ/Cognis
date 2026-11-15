# CLI Invitation Delivery

**Feature Branch:** feature-cli-invite-integration

## Generate tokens without email

The registration token command now requests manual delivery using the current registration API contract. It accepts no email argument and returns a registration link without sending email. The email invitation command explicitly requests email delivery. Existing authorization and domain restrictions still apply.

## Verify command outcomes

Route-backed tests cover anonymous and email-bound issuance, rejected input, authorization failures, domain restrictions, and deliberate link output without link leakage into logs. CLI version 0.4.3 includes Registration Token adapter 0.1.42. Returned links are secrets; use verbose output when a summary abbreviates a link.

## Commits

- [4b8d1785cf568c361b88e0eb43709e268ffd26a6](https://github.com/Cognis-Labs-HQ/Cognis/commit/4b8d1785cf568c361b88e0eb43709e268ffd26a6)
- [67c4b5ab64feb16d7e5afc1a9aa47b508690861d](https://github.com/Cognis-Labs-HQ/Cognis/commit/67c4b5ab64feb16d7e5afc1a9aa47b508690861d)
- [bc15ea040864c918c3c39840ff519cc094f144e1](https://github.com/Cognis-Labs-HQ/Cognis/commit/bc15ea040864c918c3c39840ff519cc094f144e1)
