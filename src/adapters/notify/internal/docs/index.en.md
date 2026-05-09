# Internal Notification Adapter

## Overview

The Internal adapter delivers notifications directly to the in-app notification bell on every dashboard page. It is always-on by default — every notification dispatched through the gateway reaches the recipient's inbox without requiring the user to configure any notification preferences. The adapter stores up to 50 notifications per user in memory; entries are lost on server restart.

## Responsibilities

- Accept every notification dispatched by the notification gateway and place it in the recipient's in-app inbox.
- Inject the notification bell button into the dashboard toolbar via a navbar plugin — removing the adapter makes the bell disappear entirely.
- Serve a badge showing the number of unread notifications, polled every 30 seconds.
- Provide a dropdown panel for reading, dismissing, and marking notifications as read.

Not responsible for: email delivery (handled by the SMTP adapter), persistence across server restarts, or user-level opt-out through notification preferences (the adapter is always-on and bypasses the preference matrix).

## Architecture

`InternalNotificationSender` in `src/adapters/notify/internal/index.ts` implements `NotificationSender`. When `send()` is called, it appends the notification to `InternalNotificationStore` — a module-level in-memory store keyed by recipient username. Because the sender is registered as always-on via `gateway.registerAlwaysOnSender`, the gateway includes it in every dispatch regardless of user preferences.

`bootstrapNotifyAdapter` (also exported from `index.ts`) is called during gateway bootstrap via `CoreNotificationGateway.bootstrapAdapters`. It:

1. Registers the sender as always-on with `ctx.gateway.registerAlwaysOnSender('internal')`.
2. Registers the inbox API routes via `ctx.registerRoute(...)`.
3. Registers the navbar plugin and its static directory so the bell is served to the browser.

The navbar plugin (`ui/navbar-plugin.js`) is a self-contained ES module loaded by the dashboard layout after each page render. On import it:

1. Injects `notifications.css` into the document head.
2. Creates the notification bell button and inserts it into `.account-cluster` before `.profile-menu`.
3. Fetches the initial unread count and starts a 30-second polling loop.
4. Opens a dropdown panel on click, loading the full notification list from the API.

## API Routes

| Method   | Path                                   | Description                              | Auth |
| -------- | -------------------------------------- | ---------------------------------------- | ---- |
| `GET`    | `/api/v1/notifications/inbox`          | List the caller's notifications          | User |
| `GET`    | `/api/v1/notifications/inbox/count`    | Unread count for the caller              | User |
| `PUT`    | `/api/v1/notifications/inbox/read`     | Mark all notifications as read           | User |
| `PUT`    | `/api/v1/notifications/inbox/:id/read` | Mark one notification as read            | User |
| `DELETE` | `/api/v1/notifications/inbox/:id`      | Delete one notification                  | User |
| `DELETE` | `/api/v1/notifications/inbox`          | Delete all of the caller's notifications | User |

## Configuration

The adapter has no configuration. It is active as long as the notify gateway loads it (i.e. always, since adapters are discovered automatically). Disabling the adapter requires removing or renaming the adapter directory so the gateway no longer discovers it — at which point the notification bell disappears from the UI.
