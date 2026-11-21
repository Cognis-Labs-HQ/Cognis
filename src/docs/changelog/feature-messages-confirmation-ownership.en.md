# Owned Messages Confirmations

**Feature Branch:** feature-messages-confirmation-ownership

## Keep Choices with Their Owner

Messages 2.8.2 binds Leave and template confirmation choices to their original owner. Safe dismissal never mutates; duplicates and stale controls cannot repeat writes. Newer rooms, accounts, sessions and template preferences retain their state.

## Report Confirmed Outcomes

Leave distinguishes rejection, uncertain delivery and acknowledged refresh failure, without automatic replay. Its follow-up requires a fresh successful list. Templates persist once and preserve newer edits. Four localized guides and outcome messages accompany the change. Server policy and presentation version 2 remain unchanged; Profile 4.0.0 and Internal Notifications 0.5.36 are retained.

This is a bounded Messages continuation of #542 and #330; both broader audits remain partial.

## Commits

- [65a184048e99609d903c908da1c37d6a0bcfae77](https://github.com/Cognis-Labs-HQ/Cognis/commit/65a184048e99609d903c908da1c37d6a0bcfae77)
