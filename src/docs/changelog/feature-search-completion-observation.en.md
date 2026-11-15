# Search Test Reliability

**Feature Branch:** feature-search-completion-observation

## Check completed Search dismissal

Search selection tests now wait for the overlay to be removed within a bounded deadline instead of assuming that asynchronous selection and closing animation finish after a fixed delay. Coverage still checks callback counts, selected values, cancellation ownership and destinations. Delayed completion succeeds, while a popup that stays open fails the removal check.

## Commits

- [Wait for actual Search overlay removal in completion tests](https://github.com/Cognis-Labs-HQ/Cognis/commit/def5d8af2582d609a5529c43240bb47cdcf497ab)
