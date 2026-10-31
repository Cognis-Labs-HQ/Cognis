# SMTP Email Adapter

SMTP supports plain TCP, STARTTLS and TLS, optional authentication and bounded transient retries. Templates are contributed through the Notification Gateway; the transport formats MIME, sanitizes headers and supports attachments. All delivery entry points use the selected queue. `send` waits for delivery; `sendTracked` returns its receipt immediately.

## Bootstrap Purposes

SMTP purposes must be registered through `ctx` during gateway or module bootstrap. Obtain `notify:registerSmtpPurpose`, await it with a local purpose name and retain the returned owner-scoped identifier. Each registration creates a dedicated queue and recipient cooldown state; the adapter has no built-in purpose list.

```js
const registerPurpose = ctx.getCapability("notify:registerSmtpPurpose");
const purpose = await registerPurpose("digest");
const sendEmail = ctx.getCapability("notify:sendEmail");
await sendEmail({ purpose, recipientEmail, templateId, variables });
```

Every `notify:sendEmail` call must include an existing `purpose`. Missing and unknown purposes fail before SMTP transport; sends cannot create purposes implicitly. Registration is rejected after bootstrap returns, fails or times out, including through retained callbacks and detached asynchronous work. Modules enabled after startup may register during their own bootstrap. Module disable/uninstall disposes its queues, rejects pending deliveries and closes active SMTP sessions.

## Delivery and Queues

The default interval is fifteen seconds per normalized recipient within each purpose. Independent purposes drain concurrently, so a slow connection, retry or cooldown in one queue cannot block another. Cooldowns advance only after successful delivery. Queue inspection combines all purposes, includes their identifiers and retains up to 200 completed records per queue. Queues are in memory.

The generic envelope carries `purpose`; specialized SMTP send/queue helpers now take the purpose as their first argument. The gateway test helper takes `(senderId, purpose, recipientEmail, config)`. Existing Notification Gateway helpers supply purposes registered by that gateway. Generic component/module callers register their own purposes during bootstrap and reuse the returned identifiers at runtime.

## Configuration

Configure `COGNIS_SMTP_HOST`, `COGNIS_SMTP_PORT` (587), `COGNIS_SMTP_FROM`, optional `COGNIS_SMTP_USER`/`COGNIS_SMTP_PASS` and `COGNIS_SMTP_SECURE` (`none`, `starttls` or `tls`). Sender name, EHLO host, certificate policy, authentication policy and verification-code length use the existing adapter settings. Tests may supply a configuration override, retained with the queued message.
