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
