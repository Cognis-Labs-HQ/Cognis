# Internal Notification Adapter

Bootstrap registers the always-on sender through `notify:registerAlwaysOnSender` on ctx; it receives no concrete gateway. Sender contracts come from `@cognis/core`.

## Overview

The Internal adapter delivers notifications directly to the in-app notification bell on every dashboard page. It is always-on by default — every notification dispatched through the gateway reaches the recipient's inbox without requiring the user to configure any notification preferences. The adapter stores up to 50 notifications per user in memory; entries are lost on server restart.

## Responsibilities

- Accept every notification dispatched by the notification gateway and place it in the recipient's in-app inbox.
- Inject the notification bell button into the dashboard toolbar via a navbar plugin — removing the adapter makes the bell disappear entirely.
- Serve a badge showing the number of unread notifications, polled every 10 seconds while visible and 30 seconds while hidden.
- Provide a dropdown panel for reading, dismissing, and marking notifications as read.

Not responsible for: email delivery (handled by the SMTP adapter), persistence across server restarts, or user-level opt-out through notification preferences (the adapter is always-on and bypasses the preference matrix).

## Architecture

`InternalNotificationSender` in `src/adapters/notify/internal/index.ts` implements `NotificationSender`. When `send()` is called, it appends the notification to `InternalNotificationStore` — a module-level in-memory store keyed by recipient username. Because the sender is registered as always-on via `gateway.registerAlwaysOnSender`, the gateway includes it in every dispatch regardless of user preferences.

`bootstrapNotifyAdapter` (also exported from `index.ts`) is called during gateway bootstrap via `CoreNotificationGateway.bootstrapAdapters`. It:

1. Registers the sender as always-on through the ctx capability `notify:registerAlwaysOnSender`.
2. Registers the inbox API routes via `ctx.registerRoute(...)`.
3. Registers the navbar plugin and its static directory so the bell is served to the browser.

The navbar plugin (`ui/navbar-plugin.js`) exports `mountProvider(scopedUiCtx)`. After the dashboard shell is ready, the public provider loader mounts it within the provider lifetime. It:

1. Injects `notifications.css` into the document head.
2. Creates the notification bell button and inserts it into `.account-cluster` before `.profile-menu`.
3. Loads the inbox and starts a polling loop: every 10 seconds while the page is visible and 30 seconds while hidden.
4. Opens a dropdown panel on click, loading the full notification list from the API.

## API Routes

| Method   | Path                            | Description                              | Auth |
| -------- | ------------------------------- | ---------------------------------------- | ---- |
| `GET`    | `/api/v1/notify/inbox`          | List the caller's notifications          | User |
| `GET`    | `/api/v1/notify/inbox/count`    | Unread count for the caller              | User |
| `PUT`    | `/api/v1/notify/inbox/read`     | Mark all notifications as read           | User |
| `PUT`    | `/api/v1/notify/inbox/:id/read` | Mark one notification as read            | User |
| `DELETE` | `/api/v1/notify/inbox/:id`      | Delete one notification                  | User |
| `DELETE` | `/api/v1/notify/inbox`          | Delete all of the caller's notifications | User |

## Configuration

The adapter has no configuration. It is active as long as the notify gateway loads it (i.e. always, since adapters are discovered automatically). Disabling the adapter requires removing or renaming the adapter directory so the gateway no longer discovers it — at which point the notification bell disappears from the UI.

Notification producers may mark an entry as continuous and provide action-button descriptors containing an identifier, accessible label, optional SVG icon, and consequence. Continuous entries remain visible until their supplied lifetime ends. The adapter validates and renders those generic descriptors, then emits the selected identifier and notification payload; it does not interpret the producer's domain or invoke producer capabilities.

Producers may correlate a continuous notification with another UI prompt. A generic `cognis:notification-resolved` event removes and deletes every notification with the matching correlation identifier without teaching the adapter what produced it.

Producers may attach a `metadata.localizedText` map keyed by locale, with `subject` and `body` strings. The internal browser adapter selects the first supported browser locale and otherwise uses the original envelope text; it does not interpret the producer’s domain.

## Typed Delivery Contracts

Internal delivery obtains the structured database executor through ctx. Its logging contract uses the supported bootstrap severity levels. Encryption, inbox authorization and always-on delivery remain unchanged.

## Account deletion receipts

During `deprovision-user` → `cleanup-dependencies`, the component resolves `auth:deprovisionOutcome` version 1 through `system:contracts` and calls `deletedAccount(input, stageResults)` with the original objects from that invocation. Only an Auth-owned receipt confirming a committed deletion authorizes removal of the account's stored notifications. Copied results, disable/archive outcomes, and missing or unavailable receipts do not authorize this cleanup.

Deploy with the bundled Auth 2.2.12 provider or an alternative implementing this versioned contract; mutable public flow results are not a fallback. Cleanup uses the committed receipt rather than reauthorizing after deletion. An external mutation already started may partially complete before a later failure; cross-component rollback is not guaranteed. Normal UI controls and tutorials are unchanged.

This migration protects the bundled cleanup consumers. Before enabling account deletion in a deployment, update or disable external cleanup hooks that still trust mutable public flow results.

## Inbox state and recovery

Open the bell to browse notifications. Retry reloads the inbox without repeating a read-marking or dismissal request. A failed first load does not mean the inbox is empty. If a refresh fails, the last confirmed rows, search results and unread count remain available. A rejected change and an unconfirmed change have different messages; an unconfirmed change may already have completed. Refresh before attempting another change. When a change is confirmed but its refresh fails, the confirmed change remains visible.

The navbar exports `mountProvider(scopedUiCtx)` for the public provider loader. The adapter registers `notify:internal:readInbox` and `notify:internal:mutateInbox`, each with `request` and `reconcile` stages. Only valid inbox responses and current-route acknowledgement receipts update the in-memory snapshot. The newest eligible read wins; pending writes prevent overlapping actions and supersede older reads. Every accepted refresh reconciles content, ordering and read status, including unchanged notification IDs. No write is automatically replayed.

Snapshots and pending UI completions belong to the current account, token, page and provider lifetime. Logout, account changes, page mounts and provider disposal revoke old work. Detached rows and closed confirmations cannot perform later actions. The public search registration, event listeners, timers and transient panel registration are released with their owner. No browser-persistent inbox cache is created.

The workspace tutorial continues to open `#notification-toggle` and explain `.notification-panel`. Its shared transient lifetime closes the panel, including an opening with a pending read. Confirmed empty inboxes keep Clear disabled; unavailable inboxes offer Retry rather than claiming to be empty. Continuous notifications retain their existing separate popup, action, correlation and expiry behavior. This change does not define notification categories or delivery preferences.

Producer correlation resolutions are serialized and deduplicated within the current owner lifetime. They wait for pending user changes and the latest read before dismissing matching notifications; an unconfirmed deletion is never automatically replayed.

## Keyboard destinations

Use Tab to reach a notification link, then Enter to open its destination. An unread notification without a destination has a Mark Notification as Read button; an arrival without a destination has an Open Notification Inbox button. Buttons use their native Enter and Space behavior. Commands, Remove and Dismiss remain separate controls with visible keyboard focus. Opening a nonlinked arrival keeps the inbox open.

Links preserve the browser’s modified-click and middle-click behavior. These activations leave the current inbox and read status unchanged. Ordinary activation keeps the existing read acknowledgement and navigation policy; following a destination is not evidence that marking it read succeeded. Only HTTP and HTTPS destinations become links. External destinations use a separate browsing context with opener and referrer protection.

The cancelable `cognis:notification-action` event applies to ordinary and modified link activation. The owner synchronously claims ordinary clicks before awaiting inbox changes, so the public router cannot navigate twice. Pending or unavailable row controls lose their link targets until a successful refresh; retired controls reject activation. The workspace guide retains its bell and panel targets and explains links, mark-read buttons, keyboard controls and read-only Retry. Continuous arrival commands, expiry and correlation lifetimes remain unchanged.

## Stylesheet recovery

The provider waits for one shared stylesheet attempt for up to five seconds. A load event or an already loaded sheet permits styled presentation. An error or timeout is an unavailable-style outcome, not successful readiness: the current provider still opens the bell and inbox, with a localized error toast explaining that the layout may be incomplete. Inbox Retry only reloads notification data. Reopening the app starts a new provider mount that can try the stylesheet again; the current mount does not repeatedly retry.

Each browser link owns its pending, loaded, failed or timed-out attempt state, shared by directly served and bundled code. Resource listeners and the deadline outlive individual canceled waiters, then release at the terminal outcome. Canceling one provider releases only its wait and cannot remove another waiter's useful request. Canceled providers cannot later create their bell, read the inbox or show the failure notice. Disposal dismisses that provider's stylesheet-error toast.

Healthy external links and their attributes are preserved. Failed or timed-out provider-created links are removed; adopted links remain owned by their original loader and are skipped by later attempts unless they acquire a loaded sheet. The next current mount creates at most one replacement, and concurrent mounts share its deadline. Late events from an exhausted attempt cannot settle its replacement. No page-stylesheet ownership markers are added, so route-style swaps do not take ownership of this provider resource. The bell, inbox and arrival lifetimes remain owned by the scoped ctx.

The existing workspace guide still targets `#notification-toggle` and `.notification-panel`, including after a degraded mount or successful recovery. Its controls and progression do not change, and no separate tutorial is required. Resource recovery does not change notification producers, categories, delivery policy or arrival suppression.
