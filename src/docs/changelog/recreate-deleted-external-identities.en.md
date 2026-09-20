# Recreate Deleted External Accounts

**Feature Branch:** recreate-deleted-external-identities

## Restore After Successful Authentication

A successfully authenticated external identity can now recreate its deleted provider-scoped account. Cognis clears the deletion record in the same transaction that restores the account, while failed authentication cannot clear it.

## Commits

- [5282575c57d00af6665f5c2d4ae3a9e265b870da](https://github.com/Cognis-Labs-HQ/Cognis/commit/5282575c57d00af6665f5c2d4ae3a9e265b870da)
