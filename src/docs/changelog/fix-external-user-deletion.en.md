# Deleted Users Stay Deleted

**Feature Branch:** fix-external-user-deletion

## Durable External Deletion

Deleting an externally authenticated user now records a one-way identity fingerprint before removing the account. Authentication and provider reconciliation reject that fingerprint, preventing an active provider session from silently recreating the deleted user.

## Commits

- [69ba80376c9eee932299c8ae9f49f86819f77a0d](https://github.com/Cognis-Labs-HQ/Cognis/commit/69ba80376c9eee932299c8ae9f49f86819f77a0d)
- [dac7a3c55115a645ca04a63d7a336e88c69c7673](https://github.com/Cognis-Labs-HQ/Cognis/commit/dac7a3c55115a645ca04a63d7a336e88c69c7673)
