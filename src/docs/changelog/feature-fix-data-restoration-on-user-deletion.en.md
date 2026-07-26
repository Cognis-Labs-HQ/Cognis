# Secure Account Deletion

## Deleted accounts no longer retain activity

Deleting a user now permanently removes their messaging memberships and presence, social relationships and posts, classroom records, calendar data, and meeting participation. Recreating the same username therefore cannot recover the deleted account's private activity.

## Calendar cleanup completes reliably

Account deletion now removes the user's calendars and events from both persistent storage and the active calendar service. It also avoids deleting the global file-size configuration as though it belonged to the user, preventing a successful account deletion from being reported as a bad request.

## Conversations and notifications are deprovisioned safely

Deleted users now leave their group conversations with a visible leave event instead of silently removing the conversations. Chats automatically archive for a sole remaining member and are permanently deleted when nobody remains. Re-created accounts also reuse an existing one-to-one conversation instead of creating duplicates, and all in-app notifications are purged during deletion.
