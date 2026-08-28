# Secure Account Deletion

**Feature Branch:** feature-fix-data-restoration-on-user-deletion

## Deleted accounts no longer retain activity

Deleting a user now permanently removes their messaging memberships and presence, social relationships and posts, classroom records, calendar data, and meeting participation. Recreating the same username therefore cannot recover the deleted account's private activity.

## Calendar cleanup completes reliably

Account deletion now removes the user's calendars and events from both persistent storage and the active calendar service. It also avoids deleting the global file-size configuration as though it belonged to the user, preventing a successful account deletion from being reported as a bad request.

## Conversations and notifications are deprovisioned safely

Deleted users now leave their group conversations with a visible leave event instead of silently removing the conversations. Chats automatically archive for a sole remaining member and are permanently deleted when nobody remains. A newly created account never regains a one-to-one conversation that belonged to a deleted account, even when it uses the same username. Duplicate active conversations are still prevented by matching only rooms where both current accounts are members, and all in-app notifications are purged during deletion.

## Message requests are clearly separated

Repeated attempts to start the same pending conversation no longer send another request notification, and the client blocks duplicate submissions while one is in progress. Request notifications now use their own Message Requests category, and pending requests appear under a dedicated heading in the Messages sidebar instead of being mixed with conversations.

## Declined requests close safely

Declining a message request now moves the recipient away from the room they just left instead of attempting to load its encryption key. The rejected room follows the standard chat lifecycle, archiving for its remaining requester or being deleted when empty.

## Commits

- [9735e00](https://github.com/Cognis-Labs-HQ/Cognis/commit/9735e00a2bb3ef7b3a1f10aa49494f81007dece2)
