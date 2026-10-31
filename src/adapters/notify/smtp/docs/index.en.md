# SMTP Email Adapter

## Bootstrap and Channels

SMTP owns action registration, rendering and queues. Register `notify:registerEmailPurpose` with a local identifier and an action function that builds the message from variables. Gateways, adapters and external modules register only within their own bootstrap scope; identifiers include the owner. Auth, Registration, TFA and Share own their message content. SMTP has no list of application purposes or templates.

```js
const registerPurpose = ctx.getCapability("notify:registerEmailPurpose");
const purpose = await registerPurpose("digest", (variables) => ({
    subject: variables.subject,
    body: variables.body,
}));
const sendEmail = ctx.getCapability("notify:sendEmail");
await sendEmail({ purpose, recipientEmail, variables });
```

Every `notify:sendEmail` call supplies an existing purpose and variables. There is no `templateId`. Missing or unknown purposes are rejected, and asynchronous actions are checked again before enqueueing. Registration closes on bootstrap completion, failure or timeout. Gateway completion hooks run under the same owner after providers bootstrap.

Notification categories use the existing `notify:registerCategory` capability. SMTP creates a queue during registration and returns a bound delivery handle to the gateway. The gateway remains sender-neutral. No send creates or infers a purpose; direct SMTP sends require an explicit registered purpose.

Gateway disable and module unmount dispose owned actions and pending deliveries. Re-enable restores fresh queues without replaying cancelled mail. Shared categories stay active while another registered owner remains active. Disabling the SMTP sender also closes its sessions and cancels pending delivery; re-enabling restores only registrations that still exist.

The default cooldown is fifteen seconds per normalized recipient within each queue. Independent queues drain concurrently. Only successful delivery advances the cooldown. Queue history retains up to 200 completed records per queue in memory. `sendEmail` returns the actual queue receipt; a queued receipt does not claim successful SMTP delivery.

The sender contract uses generic `test(recipient, config)` and optional bootstrap/channel/lifecycle hooks. The gateway calls `testSender(senderId, recipient, config)` and contains no SMTP-specific test, verification, invitation or login methods. Existing SMTP-specific gateway helpers and the separate template registry are removed.

## Configuration

Configure `COGNIS_SMTP_HOST`, `COGNIS_SMTP_PORT` (587), `COGNIS_SMTP_FROM`, optional `COGNIS_SMTP_USER`/`COGNIS_SMTP_PASS` and `COGNIS_SMTP_SECURE` (`none`, `starttls` or `tls`). Sender name, EHLO host, certificate policy, authentication policy and verification-code length use the existing adapter settings. Tests may supply a configuration override, retained with the queued message.
