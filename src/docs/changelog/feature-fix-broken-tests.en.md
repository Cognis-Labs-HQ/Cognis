# Reliable Shared Calendars

## Shared calendar invitations and responses work consistently

Events created through writable shared calendars now include the full shared audience, route notifications to each recipient's calendar, and allow read-only recipients to respond from the shared view.

## Re-sharing preserves access

Sharing a calendar with an existing recipient no longer resets write permission or expiration settings.

## Source files meet architecture limits

Calendar, meeting, and whiteboard source files were trimmed below the enforced size limit without changing their behavior.

## Share popup loads successfully

The Link Share popup now loads its API callbacks from the Share gateway's registered static asset path instead of requesting a missing adapter-local file.

## Login invalidates keyring unlocks

A completed account login now discards any browser session unlock key. Keyrings with a separate password remain locked until that password is entered locally, while ordinary page reloads can still retain an explicitly unlocked session.

## Chats unlock before key recovery

Opening a conversation now checks and unlocks the local keyring before requesting a missing room key. Room metadata no longer distributes keys; an explicit, authenticated room-entry request recovers a key only after the unlocked keyring reports it missing.

## Destroy removes every local key

Destroying a keyring now waits for pending saves, removes its local envelope and session key, and invalidates component key caches before creating the replacement vault. The destructive confirmation uses cancel styling, while the safe cancellation action uses confirm styling.

## One-time secret delivery and synchronized chat previews

Keyring creation and destruction now use separate success and warning notifications. Chat previews refresh as soon as a room key enters the keyring, and the server records room-key delivery per member so an authenticated member can receive a generated room key only once; a lost key must be supplied manually or through a new participant invitation. Meeting passwords are encrypted at rest and are likewise delivered to each invited participant only on their first join.
