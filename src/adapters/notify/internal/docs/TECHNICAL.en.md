# Technical Reference

The public interfaces and operational rules of In-App Notifications.

## Interfaces

createNotificationSender resolves the current store lazily. bootstrapNotifyAdapter registers the always-on sender, authenticated inbox routes and the browser bell. With db:executor it initializes DbInternalNotificationStore; without it a warning identifies volatile in-memory storage.

| Method   | Path                            | Description                              | Auth |
| -------- | ------------------------------- | ---------------------------------------- | ---- |
| `GET`    | `/api/v1/notify/inbox`          | List the caller's notifications          | User |
| `GET`    | `/api/v1/notify/inbox/count`    | Unread count for the caller              | User |
| `PUT`    | `/api/v1/notify/inbox/read`     | Mark all notifications as read           | User |
| `PUT`    | `/api/v1/notify/inbox/:id/read` | Mark one notification as read            | User |
| `DELETE` | `/api/v1/notify/inbox/:id`      | Delete one notification                  | User |
| `DELETE` | `/api/v1/notify/inbox`          | Delete all of the caller's notifications | User |

The navbar plugin, styles, translations and icons use the bootstrap-registered `/static/gateways/notify-internal/` directory. The bell asset belongs to this adapter under `ui/assets/`.

## Configuration

Notification producers may mark an entry as continuous and provide action-button descriptors containing an identifier, accessible label, optional SVG icon, and consequence. Continuous entries remain visible until their supplied lifetime ends. The adapter validates and renders those generic descriptors, then emits the selected identifier and notification payload; it does not interpret the producer's domain or invoke producer capabilities.

Producers may correlate a continuous notification with another UI prompt. A generic `cognis:notification-resolved` event removes and deletes every notification with the matching correlation identifier without teaching the adapter what produced it.

Producers may attach a `metadata.localizedText` map keyed by locale, with `subject` and `body` strings. The internal browser adapter selects the first supported browser locale and otherwise uses the original envelope text; it does not interpret the producer’s domain.

## Behavior

Both stores retain up to fifty notifications per recipient, evicting the oldest when full. The database store encrypts persisted payloads and survives restarts with a stable DATA_ENCRYPTION_KEY. Without DB storage notifications are lost on restart; production bootstrap rejects a missing encryption key. Development may use a process-local key, which cannot decrypt older data after restart. Account deletion purges the inbox through the registered account-data owner.

### Typed Delivery Contracts

Internal delivery obtains the structured database executor through ctx. Its logging contract uses the supported bootstrap severity levels. Encryption, inbox authorization and always-on delivery remain unchanged.

### Account deletion receipts

During `deprovision-user` → `cleanup-dependencies`, the component resolves `auth:deprovisionOutcome` version 1 through `system:contracts` and calls `deletedAccount(input, stageResults)` with the original objects from that invocation. Only an Auth-owned receipt confirming a committed deletion authorizes removal of the account's stored notifications. Copied results, disable/archive outcomes, and missing or unavailable receipts do not authorize this cleanup.

Shared behavior: [Auth](/docs/gateways/auth/technical).

This migration protects the bundled cleanup consumers. Before enabling account deletion in a deployment, update or disable external cleanup hooks that still trust mutable public flow results.

## Security

Notification routes authenticate the recipient and operate on that account's records. Persistent notifications require DATA_ENCRYPTION_KEY; keep that deployment key stable and secret.

## Reference

- [src/adapters/notify/internal/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/manifest.json)
- [src/adapters/notify/internal/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/package.json)
- [src/adapters/notify/internal/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/index.ts)
- [src/adapters/notify/internal/routes/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/routes/index.ts)
