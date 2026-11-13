# SMTP Email Adapter

## Bootstrap and Channels

SMTP owns action registration, rendering and queues. Register `notify:registerEmailPurpose` with a local identifier and an action function that builds the message from variables. Gateways, adapters and external modules register only within their own bootstrap scope; identifiers include the owner. Auth, Registration, TFA and Share own their message content. SMTP has no list of application-specific purposes.

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

## Factories and Recipient Theme

`notify:emailTemplates` provides `blocks`, `compose`, `registerFactory`, `bindFactory`, `listFactories` and `render`. Built-in factories are `standard`, `code`, `action` and `digest`. During bootstrap a module can register its own factory with `id`, `labelKey`, `stringsBaseUrl`, typed `options` and a `render(message, { theme, variables, options })` callback. The returned ID includes the owner. Register a purpose with `{ factory, options }` as the third argument. Option schemas support required values, defaults and choices; unknown or invalid values are rejected before queue creation. Factories compose paragraphs, headings, codes, lists, tables, dividers and HTTP(S) action links. All text is escaped, and shell interpolation is single-pass. HTML and plain-text alternatives share the same content. Branding, logo, preheader and footer are configurable. Rendering uses the receiving account’s saved `ui-preferences.mode`; unknown recipients or missing preferences use light mode. Caller-supplied theme metadata cannot override the recipient. Disable or failed bootstrap removes factories and rejects in-flight results from revoked owners.

```js
export async function registerReport(ctx, heading) {
    const templates = ctx
        .getCapability("system:contracts")
        .resolve("notify:emailTemplates", 1);
    const factory = await templates.registerFactory({
        id: "report",
        labelKey: "module.example.report",
        stringsBaseUrl: "/static/modules/example/languages",
        options: {
            heading: {
                type: "string",
                labelKey: "module.example.heading",
                required: true,
            },
        },
        render(message, { options }) {
            return templates.compose(message, {
                blocks: [
                    templates.blocks.heading(options.heading),
                    templates.blocks.paragraph(message.body),
                ],
            });
        },
    });
    const purpose = await ctx.getCapability("notify:registerEmailPurpose")(
        "report",
        (variables) => ({ subject: variables.subject, body: variables.body }),
        { factory, options: { heading } },
    );
    return purpose;
}
```

## Readable Email Text

Email content uses a block container instead of nesting paragraphs around generated blocks. Paragraphs, codes, list items and table cells carry explicit theme colors; dark-mode footer text and light-mode links have readable contrast.

## SMTP Contract Ownership

SMTP declares its email-purpose, delivery, policy and factory contracts during its own bootstrap. Runtime definitions live in `contracts/declarations.ts`; optional public action types live in `contracts/action-delivery.ts`. The notification gateway does not declare these provider APIs. It retains generic sender and delivery-receipt types. Other adapters use the same host registration mechanism without adding Core files.

## Reliable Sharing and Tests

SMTP configuration tests can run while the sender is disabled without enabling ordinary delivery. Tests use a dedicated bootstrap-owned diagnostic queue and a staged flow; gateway shutdown cancels that queue. Empty password overrides retain the concealed stored password. Diagnostic logs include safe transport error codes and protocol response codes without credentials or server response text.

## Review and Lifecycle Hardening

SMTP connection establishment and TLS negotiation each have a thirty-second deadline. A stalled connection is destroyed rather than leaving the diagnostic request pending. Direct TLS and STARTTLS use the configured hostname for TLS identity and DNS-name SNI; IP addresses are not sent as SNI names.

## Typed Delivery Contracts

SMTP queue entries retain their required subject through delivery and retries. TLS connection options carry the cancellation signal for direct TLS and STARTTLS; certificate policy, timeout handling and connection cleanup remain unchanged.
