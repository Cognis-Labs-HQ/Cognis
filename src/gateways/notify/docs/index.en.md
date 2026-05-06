# Notification Gateway

## Overview

The Notification Gateway dispatches notifications through pluggable sender adapters. It acts as the broker between the rest of the application and the concrete delivery mechanisms — SMTP, future webhooks, or in-app sinks — without knowing which transports are configured. Gateways and routes that need to send a notification call `gateway.dispatch(envelope)` and the gateway routes the message to whichever senders the recipient has enabled for that notification category.

The gateway also owns two specialised services layered on top of its dispatch infrastructure: `TfaCodeService` for issuing and validating two-factor authentication codes, and `VerifyTokenService` for email verification flows. Both services use in-memory stores and are wired to the notification gateway's email-sending capability at bootstrap.

Sender adapters are discovered by scanning `src/adapters/notify/` at bootstrap. Each adapter directory must export a `createSender()` function. The SMTP adapter is the only built-in sender; it activates automatically when `COGNIS_SMTP_HOST` is set.

## Responsibilities

- Discover and register notification sender adapters from `src/adapters/notify/` at bootstrap.
- Dispatch notification envelopes to all senders enabled for the recipient and category.
- Persist and reload sender configurations from the database.
- Register the `system` notification category (and any categories added by other components).
- Wire TFA code issuance and verification routes.
- Wire email verification token routes.
- Register adapter admin routes for configuring and testing senders.

Not responsible for: knowing what transport to use (that is the adapter's concern), storing notification history, or managing user notification preferences beyond per-sender opt-in.

## Architecture

The central class is `CoreNotificationGateway` in `src/gateways/notify/gateway.ts`. It implements the `NotificationGateway` interface and holds a map of registered `NotificationSender` implementations.

```ts
export interface NotificationGateway {
  registerSender(sender: NotificationSender): void;
  dispatch(envelope: NotificationEnvelope): Promise<{ dispatched: string[] }>;
  registerCategory(id: string, label: string): void;
  listSenders(): NotificationSenderInfo[];
  listCategories(): NotificationCategory[];
}
```

A `NotificationEnvelope` carries `category`, `recipientUsername`, optional `recipientEmail`, `subject`, and `body`. The gateway resolves which senders to use by calling `notificationPrefStore.getSenderIds(recipientUsername, category)`. If no preference is stored for a given category, the gateway falls back to dispatching to all active senders.

`discoverSenders(path)` scans the `src/adapters/notify/` directory and dynamically imports each adapter's `createSender()` export. The gateway calls `registerSender(sender)` for each one found.

Bootstrap in `src/gateways/notify/bootstrap.ts`:
1. Instantiates `DbNotificationStore` and `DbNotificationPreferenceStore`.
2. Instantiates `CoreNotificationGateway`.
3. Calls `discoverSenders()` and `loadPersistedConfigs()`.
4. Registers the `system` notification category.
5. Instantiates `TfaCodeService` and `VerifyTokenService` with in-memory stores.
6. Registers notification, email, and adapter admin routes.

Key source locations:

| Path | Purpose |
| ---- | ------- |
| `src/gateways/notify/gateway.ts` | `CoreNotificationGateway`, `NotificationSender`, `NotificationGateway` interfaces |
| `src/gateways/notify/bootstrap.ts` | Bootstrap entry point |
| `src/gateways/notify/routes/notifications.ts` | Notification dispatch and provider management routes |
| `src/api/reuse/tfa-code.ts` | `TfaCodeService` and `InMemoryTfaStore` |
| `src/api/reuse/verify-token.ts` | `VerifyTokenService` and `InMemoryVerifyTokenStore` |
| `src/adapters/db/reuse/notification-store.ts` | `DbNotificationStore` and `DbNotificationPreferenceStore` |

## API Routes

| Method | Path | Description | Auth |
| ------ | ---- | ----------- | ---- |
| `POST` | `/api/v1/notifications/send` | Dispatch a notification | Admin |
| `GET` | `/api/v1/notifications/providers` | List registered senders | Admin |
| `GET` | `/api/v1/notifications/categories` | List notification categories | Bearer |
| `GET` | `/api/v1/notifications/preferences` | Get own notification preferences | Bearer |
| `PUT` | `/api/v1/notifications/preferences` | Update own notification preferences | Bearer |
| `POST` | `/api/v1/notifications/providers/:senderId/config` | Update sender config | Admin |
| `POST` | `/api/v1/notifications/providers/:senderId/test` | Send a test notification | Admin |
| `POST` | `/api/v1/users/tfa/request` | Request a TFA code | Bearer |
| `POST` | `/api/v1/users/tfa/verify` | Verify a TFA code | Bearer |
| `POST` | `/api/v1/users/email/verify/request` | Request email verification | Bearer |
| `POST` | `/api/v1/users/email/verify` | Complete email verification | Bearer |
| `GET` | `/api/v1/users/:username/email` | Get primary email for a user | Bearer |
| `PUT` | `/api/v1/users/:username/email` | Set primary email for a user | Bearer |
