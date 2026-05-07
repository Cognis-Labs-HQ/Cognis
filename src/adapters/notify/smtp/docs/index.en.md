# SMTP Notification Adapter

## Overview

The SMTP adapter delivers notifications as email via any SMTP server. It is the only built-in notification adapter and activates automatically when the `COGNIS_SMTP_HOST` environment variable is set. Typical use cases include delivery of two-factor authentication codes, email verification links, and any other category of notification the notification gateway dispatches.

The adapter implements greylisting-tolerant delivery: if the first send attempt is rejected with a transient error, it retries up to twice with a five-minute delay between each attempt, matching common SMTP greylisting intervals.

## Responsibilities

- Send email via the configured SMTP server using Nodemailer.
- Handle greylisting by retrying transient delivery failures (up to 2 retries, 5-minute delay).
- Expose `getConfig()` and `setConfig()` for runtime reconfiguration via the admin API.
- Expose `sendTestEmail(to)` for delivery verification without going through the notification pipeline.
- Register the notification category `email` with the notification gateway.

Not responsible for: rendering email content (the notification gateway builds the message body), managing user notification preferences (the profile gateway owns those), or delivering non-email notification types.

## Architecture

`SmtpNotificationSender` in `src/adapters/notify/smtp/smtp-notification-sender.ts` implements `NotificationSender`. It holds a Nodemailer transporter and recreates it whenever the config is updated via `setConfig()`.

### Greylisting retry logic

```ts
async function sendWithRetry(
    options: MailOptions,
    attempts = 3,
): Promise<void> {
    for (let i = 0; i < attempts; i++) {
        try {
            await this.transporter.sendMail(options);
            return;
        } catch (err) {
            if (i < attempts - 1 && isTransientError(err)) {
                await sleep(5 * 60 * 1000);
            } else {
                throw err;
            }
        }
    }
}
```

`isTransientError` returns true for SMTP 4xx responses and connection timeouts — the class of errors a greylisting filter generates.

### Runtime reconfiguration

The adapter exposes `setConfig(config)` and `getConfig()`. When the admin updates the SMTP config via the API, the notification gateway calls `setConfig()` on the adapter instance, which rebuilds the Nodemailer transporter with the new settings. No restart is required.

## Configuration

| Variable             | Default | Description                                                |
| -------------------- | ------- | ---------------------------------------------------------- |
| `COGNIS_SMTP_HOST`   | —       | SMTP server hostname; the adapter is inactive if not set   |
| `COGNIS_SMTP_PORT`   | `587`   | SMTP server port                                           |
| `COGNIS_SMTP_SECURE` | `false` | `true` for TLS on connect (port 465); `false` for STARTTLS |
| `COGNIS_SMTP_USER`   | —       | SMTP authentication username                               |
| `COGNIS_SMTP_PASS`   | —       | SMTP authentication password                               |
| `COGNIS_SMTP_FROM`   | —       | Sender address shown in the `From` header                  |

Runtime changes applied through the API override these environment values for the life of the process.

## API Routes

| Method | Path                                           | Description                                      | Auth  |
| ------ | ---------------------------------------------- | ------------------------------------------------ | ----- |
| `GET`  | `/api/v1/gateways/notify/adapters/smtp/config` | Retrieve current SMTP config (password redacted) | Admin |
| `PUT`  | `/api/v1/gateways/notify/adapters/smtp/config` | Update SMTP config at runtime                    | Admin |
| `POST` | `/api/v1/gateways/notify/adapters/smtp/test`   | Send a test email                                | Admin |
