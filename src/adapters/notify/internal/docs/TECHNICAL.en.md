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

- Serve a badge showing the number of unread notifications, polled every 10 seconds while visible and 30 seconds while hidden.

The navbar plugin (`ui/navbar-plugin.js`) exports `mountProvider(scopedUiCtx)`. After the dashboard shell is ready, the public provider loader mounts it within the provider lifetime. It:

3. Loads the inbox and starts a polling loop: every 10 seconds while the page is visible and 30 seconds while hidden.

### Inbox state and recovery

Open the bell to browse notifications. Retry reloads the inbox without repeating a read-marking or dismissal request. A failed first load does not mean the inbox is empty. If a refresh fails, the last confirmed rows, search results and unread count remain available. A rejected change and an unconfirmed change have different messages; an unconfirmed change may already have completed. Refresh before attempting another change. When a change is confirmed but its refresh fails, the confirmed change remains visible.

The navbar exports `mountProvider(scopedUiCtx)` for the public provider loader. The adapter registers `notify:internal:readInbox` and `notify:internal:mutateInbox`, each with `request` and `reconcile` stages. Only valid inbox responses and current-route acknowledgement receipts update the in-memory snapshot. The newest eligible read wins; pending writes prevent overlapping actions and supersede older reads. Every accepted refresh reconciles content, ordering and read status, including unchanged notification IDs. No write is automatically replayed.

Snapshots and pending UI completions belong to the current account, token, page and provider lifetime. Logout, account changes, page mounts and provider disposal revoke old work. Detached rows and closed confirmations cannot perform later actions. The public search registration, event listeners, timers and transient panel registration are released with their owner. No browser-persistent inbox cache is created.

The workspace tutorial continues to open `#notification-toggle` and explain `.notification-panel`. Its shared transient lifetime closes the panel, including an opening with a pending read. Confirmed empty inboxes keep Clear disabled; unavailable inboxes offer Retry rather than claiming to be empty. Continuous notifications retain their existing separate popup, action, correlation and expiry behavior.

Producer correlation resolutions are serialized and deduplicated within the current owner lifetime. They wait for pending user changes and the latest read before dismissing matching notifications; an unconfirmed deletion is never automatically replayed.

### Keyboard destinations

Use Tab to reach a notification link, then Enter to open its destination. An unread notification without a destination has a Mark Notification as Read button; an arrival without a destination has an Open Notification Inbox button. Buttons use their native Enter and Space behavior. Commands, Remove and Dismiss remain separate controls with visible keyboard focus. Opening a nonlinked arrival keeps the inbox open.

Links preserve the browser’s modified-click and middle-click behavior. These activations leave the current inbox and read status unchanged. Ordinary activation keeps the existing read acknowledgement and navigation policy; following a destination is not evidence that marking it read succeeded. Only HTTP and HTTPS destinations become links. External destinations use a separate browsing context with opener and referrer protection.

The cancelable `cognis:notification-action` event applies to ordinary and modified link activation. The owner synchronously claims ordinary clicks before awaiting inbox changes, so the public router cannot navigate twice. Pending or unavailable row controls lose their link targets until a successful refresh; retired controls reject activation. The workspace guide retains its bell and panel targets and explains links, mark-read buttons, keyboard controls and read-only Retry. Continuous arrival commands, expiry and correlation lifetimes remain unchanged.

## Security

Notification routes authenticate the recipient and operate on that account's records. Persistent notifications require DATA_ENCRYPTION_KEY; keep that deployment key stable and secret.

## Reference

- [src/adapters/notify/internal/manifest.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/manifest.json)
- [src/adapters/notify/internal/package.json](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/package.json)
- [src/adapters/notify/internal/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/index.ts)
- [src/adapters/notify/internal/routes/index.ts](https://github.com/Cognis-Labs-HQ/Cognis/blob/HEAD/src/adapters/notify/internal/routes/index.ts)
