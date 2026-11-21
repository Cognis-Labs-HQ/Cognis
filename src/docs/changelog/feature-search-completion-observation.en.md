# Search Test Reliability

**Feature Branch:** feature-search-completion-observation

## Check completed Search dismissal

Search selection tests now wait for the overlay to be removed within a bounded deadline instead of assuming that asynchronous selection and closing animation finish after a fixed delay. Coverage still checks callback counts, selected values, cancellation ownership and destinations. Delayed completion succeeds, while a popup that stays open fails the removal check.

## Commits

- [b6b3bec4110a097884ca1edd5302c63761ad222a](https://github.com/Cognis-Labs-HQ/Cognis/commit/b6b3bec4110a097884ca1edd5302c63761ad222a)
