# Consistent social membership changes

**Feature Branch:** feature-document-api-standard-for-membership-changes

## Simple membership APIs and capabilities

Chatroom members and profile followers now share a documented `POST`/`DELETE` collection convention and matching `ctx` capabilities for trusted component integrations.

## Membership capability exported to modules

The Messages adapter now publishes chatroom membership through the system `ctx` as well as the gateway capability store, allowing external modules such as Jitsi Meet to resolve it during enablement and bootstrap.

## Meeting chat membership restored on rejoin

Adding a chatroom member now also restores an archived membership. Meeting integrations can safely call the idempotent membership `add` operation before loading chat whenever a participant joins, preventing repeated `403` responses after the participant previously left the chat.

## Review feedback addressed

Profile follow membership now uses only the canonical `/follow` endpoint. The profile followers capability is published through both the gateway store and system `ctx`, and the Social gateway reports the version from its manifest.

## Manifest-derived gateway versions

Every gateway now reads its runtime registration version from its own manifest, eliminating duplicated version literals and keeping Administration metadata aligned with component releases.

## Commits

- [c9a478c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c9a478cfe93519e006eeb6098bc4023d9883b01b)
- [614b5c54](https://github.com/Cognis-Labs-HQ/Cognis/commit/614b5c54)
- [4568d5aa](https://github.com/Cognis-Labs-HQ/Cognis/commit/4568d5aa)
- [ef657f36](https://github.com/Cognis-Labs-HQ/Cognis/commit/ef657f36)
