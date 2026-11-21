# Owned Messages Confirmations

**Feature Branch:** feature-messages-confirmation-ownership

## Keep Choices with Their Owner

Messages 2.8.2 binds Leave and template confirmation choices to their original owner. Safe dismissal never mutates; duplicates and stale controls cannot repeat writes. Newer rooms, accounts, sessions and template preferences retain their state.

## Report Confirmed Outcomes

Leave distinguishes rejection, uncertain delivery and acknowledged refresh failure, without automatic replay. Its follow-up requires a fresh successful list. Templates persist once and preserve newer edits. Four localized guides and outcome messages accompany the change. Server policy and presentation version 2 remain unchanged; Profile 4.0.0 and Internal Notifications 0.5.36 are retained.

This is a bounded Messages continuation of #542 and #330; both broader audits remain partial.

## Commits

- [d42f534be9ab33a9041d203572f0f0731206d5ad](https://github.com/Cognis-Labs-HQ/Cognis/commit/d42f534be9ab33a9041d203572f0f0731206d5ad)
