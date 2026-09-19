# Reliable SSO Social Identity and Notifications

**Feature Branch:** work

## SSO Handles Become Profile Identities

New SSO profiles now prefer the provider-supplied handle over the opaque Cognis account ID while retaining the account ID as the canonical ownership key.

## Notifications Reach SSO Accounts

Notification dispatch resolves profile handles to canonical account IDs, and social follow, message, reaction, request, and call notifications now target those stable account identities.

## Profile Polling Follows Route and Page Lifecycles

Follower refreshes now use the published follower-list route, and polling does not start after its page navigation signal has already been aborted.

## Users Invite Action Restored

The Registration gateway once again contributes a **+ Invite** action to the Users page for owners and eligible founding users. The action is hidden when registration tokens are unavailable or policy disallows invitations.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/0c20e406
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ce0d316b
