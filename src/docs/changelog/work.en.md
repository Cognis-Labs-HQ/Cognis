# Reliable whiteboard guest links

## Keep share guests authenticated

Opening a whiteboard share link now preserves its scoped guest session. Cognis no longer checks the temporary guest identity as a regular user account, clears its token, or reports that the account was deleted.

## Load guest-aware dashboard data

Shared pages now use the Share gateway's guest-session capability when choosing profile and dashboard requests, preventing irrelevant account-only requests from failing while a whiteboard is open.
