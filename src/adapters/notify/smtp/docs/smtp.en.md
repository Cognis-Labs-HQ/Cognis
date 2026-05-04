# SMTP Notification Adapter

Implements the `NotificationSender` interface using SMTP to deliver email notifications.

## Configuration

All configuration is provided via environment variables or at runtime via `setConfig`.

| Variable                  | Default         | Description                                                          |
| ------------------------- | --------------- | -------------------------------------------------------------------- |
| `COGNIS_SMTP_HOST`        | —               | SMTP server hostname. **Required** to activate the adapter.          |
| `COGNIS_SMTP_PORT`        | `587`           | TCP port for the SMTP connection.                                    |
| `COGNIS_SMTP_SECURE`      | `starttls`      | TLS mode: `starttls`, `tls`, or `none`.                              |
| `COGNIS_SMTP_FROM`        | `cognis@{host}` | Envelope sender address.                                             |
| `COGNIS_SMTP_SENDER_NAME` | —               | Display name shown in the From header (e.g. `Cognis Notifications`). |
| `COGNIS_SMTP_USER`        | —               | SMTP authentication username (optional).                             |
| `COGNIS_SMTP_PASS`        | —               | SMTP authentication password (optional).                             |

## Greylisting

Many mail servers employ greylisting: they issue a temporary `4xx` rejection the first time they see a new sender/recipient combination, expecting legitimate servers to retry after a short delay.

The adapter automatically retries on any `4xx` (temporary) SMTP response. By default it retries up to **2 times** with a **5-minute delay** between attempts, which satisfies the minimum retry window required by virtually all greylisting implementations.

These values can be adjusted at runtime via `setConfig` or the Administration UI:

| Field                  | Default          | Description                                                                             |
| ---------------------- | ---------------- | --------------------------------------------------------------------------------------- |
| `greylistRetries`      | `2`              | Maximum number of retry attempts after a `4xx` response. Set to `0` to disable retries. |
| `greylistRetryDelayMs` | `300000` (5 min) | Milliseconds to wait between retry attempts.                                            |

Permanent `5xx` errors (e.g. unknown user) are never retried.

## Activation

The adapter is loaded automatically by `CoreNotificationGateway.discoverSenders()` when `COGNIS_SMTP_HOST` is set. It registers under the sender ID `smtp`.

## Runtime reconfiguration

Administrators can update SMTP settings at runtime through the Administration UI or via the API (`PUT /api/v1/notifications/providers/smtp/config`). Changes take effect immediately without a server restart, and are persisted to the database through `DbNotificationStore`.

## Test email

Use the Administration UI or `POST /api/v1/notifications/providers/smtp/test` with a `{ "to": "..." }` body to verify connectivity.

## Sender name

The sender name displayed in the Administration UI is `SMTP Email`.
