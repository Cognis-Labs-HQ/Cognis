# Secure Account Deletion

## Deleted accounts no longer retain activity

Deleting a user now permanently removes their messaging memberships and presence, social relationships and posts, classroom records, calendar data, and meeting participation. Recreating the same username therefore cannot recover the deleted account's private activity.

## Calendar cleanup completes reliably

Account deletion now removes the user's calendars and events from both persistent storage and the active calendar service. It also avoids deleting the global file-size configuration as though it belonged to the user, preventing a successful account deletion from being reported as a bad request.
