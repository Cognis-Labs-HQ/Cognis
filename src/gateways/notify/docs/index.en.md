# Notification Gateway

The gateway brokers notifications through optional sender adapters. It does not require an email transport. Adapters export `createNotificationSender()` and own their configuration, connections, queues and test delivery. In-app senders can remain available when email delivery is absent.

## Delivery Contracts

Components use ctx capabilities rather than retaining the gateway implementation:

- `notify:dispatch` sends an envelope to the recipient's selected category senders and always-on senders.
- `notify:dispatchToRole` resolves account IDs and dispatches to a role.
- `notify:listSenders` returns public sender metadata. `requiresVerifiedEmail` declares an email requirement independently of the sender ID.
- `notify:registerCategory(id, label)` is restricted to bootstrap. Each participating sender creates a channel and returns a bound delivery handle. Shared owners retain the channel until the final owner is removed.

Provider contracts are exported from `@cognis/core`. Adapter bootstrap receives ctx capabilities and bounded host registration functions, without the concrete gateway. Provider tests delegate through `testSender(senderId, recipient, config)`.

## Email Actions

An optional email provider contributes `notify:registerEmailPurpose(id, action)`, `notify:sendEmail`, `notify:emailAvailable` and `notify:emailCodeLength`. Consumers supply their own content; registration is allowed only during their bootstrap and returns an owner-scoped purpose. Sending requires that purpose, a recipient and variables. It never creates a queue. Without an email provider, email delivery actions are unavailable while stored addresses remain readable.

Email verification applies equally to local and SSO accounts. Codes and verification tokens bind the complete account ID and address. Verification uses the email provider's code length, independently of TFA adapters. Delivery outages do not waive required verification. The security setting uses `userValidationMode: "email"` or `"none"`.

## Lifecycle

Disable and unmount revoke owned registrations and pending delivery. Re-enable restores fresh channels without replaying cancelled messages. Other owners of a shared category remain active. Async message actions cannot enqueue after their registration is disposed or replaced.

## Browser Capabilities

The lifecycle-scoped `notify:emailClient` provides own-account email requests, trusted domains, administrator `listUserEmails`, online-only `resendUserEmail` and `emailAvailable`. Settings, Users and Administration resolve it through ctx. Email edits are cached and queued by their owning provider; verification remains online. `GET /api/v1/notify/email-delivery` is authenticated and returns only availability, not provider configuration.

Offline Mode and Broadcast share the top banner stack above the header. Offline Mode has priority, cannot be dismissed and offers Recheck Connectivity and Refresh after recovery. Broadcast acknowledgement, audience and scheduling policies remain enforced independently. Banner backgrounds and collapsibility are configured through the shared banner capability.
