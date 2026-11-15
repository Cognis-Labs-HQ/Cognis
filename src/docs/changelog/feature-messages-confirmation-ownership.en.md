# Owned Messages Confirmations

**Feature Branch:** feature-messages-confirmation-ownership

## Keep Choices with Their Owner

Messages 2.8.2 binds Leave and template confirmation choices to their original owner. Safe dismissal never mutates; duplicates and stale controls cannot repeat writes. Newer rooms, accounts, sessions and template preferences retain their state.

## Report Confirmed Outcomes

Leave distinguishes rejection, uncertain delivery and acknowledged refresh failure, without automatic replay. Its follow-up requires a fresh successful list. Templates persist once and preserve newer edits. Four localized guides and outcome messages accompany the change. Server policy and presentation version 2 remain unchanged; Profile 4.0.0 and Internal Notifications 0.5.36 are retained.

This is a bounded Messages continuation of #542 and #330; both broader audits remain partial.

## Commits

- [44a383823bb5df1be0a03267d066af1de856f6ac](https://github.com/Cognis-Labs-HQ/Cognis/commit/44a383823bb5df1be0a03267d066af1de856f6ac)
- [acd169da920a98241254fddfa1a6b69580a0ed3a](https://github.com/Cognis-Labs-HQ/Cognis/commit/acd169da920a98241254fddfa1a6b69580a0ed3a)
- [6aeeab93379e5850f88aa9d49ac16f6144d8c0c6](https://github.com/Cognis-Labs-HQ/Cognis/commit/6aeeab93379e5850f88aa9d49ac16f6144d8c0c6)
- [7d135897d848c17f844d74f7ededacd4c574126c](https://github.com/Cognis-Labs-HQ/Cognis/commit/7d135897d848c17f844d74f7ededacd4c574126c)
