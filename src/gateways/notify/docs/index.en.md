# Notification Gateway

The gateway brokers notifications through optional sender adapters. It does not require an email transport. Adapters export `createNotificationSender()` and own their configuration, connections, queues and test delivery. In-app senders can remain available when email delivery is absent.

## Usage Examples

Components use ctx capabilities rather than retaining the gateway implementation:

- `notify:dispatch` sends an envelope to the recipient's selected category senders and always-on senders.
- `notify:dispatchToRole` resolves account IDs and dispatches to a role.
- `notify:listSenders` returns public sender metadata. `requiresVerifiedEmail` declares an email requirement independently of the sender ID.
- `notify:registerCategory(id, label)` is restricted to bootstrap. Each participating sender creates a channel and returns a bound delivery handle. Shared owners retain the channel until the final owner is removed.

Provider contracts are exported from `@cognis/core`. Adapter bootstrap receives ctx capabilities and bounded host registration functions, without the concrete gateway. Provider tests delegate through `testSender(senderId, recipient, config)`.

In Administration, prepare a notification under Notifications and choose Send Notification, or prepare an announcement under Broadcasts and choose Create Broadcast. These explicit actions send or publish the draft; the general Settings Save does neither.

## Technical Specification

### Email Actions

An optional email provider contributes `notify:registerEmailPurpose(id, action)`, `notify:sendEmail`, `notify:emailAvailable` and `notify:emailDeliveryPolicy`. Consumers supply their own content; registration is allowed only during their bootstrap and returns an owner-scoped purpose. Sending requires that purpose, a recipient and variables. It never creates a queue. Without an email provider, email delivery actions are unavailable while stored addresses remain readable.

Email verification applies equally to local and SSO accounts. Codes and verification tokens bind the complete account ID and address. Email verification reads `codeLength` from the provider-owned `notify:emailDeliveryPolicy` version 1 contract at each issuance. With SMTP, the Notification adapter’s Code Length setting also governs Email Code TFA. Changes apply to subsequent codes; existing codes retain their issued length until used, replaced or expired. An absent, disabled or unconfigured policy owner causes issuance to fail explicitly. Delivery outages do not waive required verification. The security setting uses `userValidationMode: "email"` or `"none"`.

### Lifecycle

Disable and unmount revoke owned registrations and pending delivery. Re-enable restores fresh channels without replaying cancelled messages. Other owners of a shared category remain active. Async message actions cannot enqueue after their registration is disposed or replaced.

### Browser Capabilities

The lifecycle-scoped `notify:emailClient` provides own-account email requests, trusted domains, administrator `listUserEmails`, online-only `resendUserEmail` and `emailAvailable`. Settings, Users and Administration resolve it through ctx. Email edits are cached and queued by their owning provider; verification remains online. `GET /api/v1/notify/email-delivery` is authenticated and returns only availability, not provider configuration.

Offline Mode and Broadcast share the top banner stack above the header. Offline Mode has priority, cannot be dismissed and offers Recheck Connectivity and Refresh after recovery. Broadcast acknowledgement, audience and scheduling policies remain enforced independently. Banner backgrounds and collapsibility are configured through the shared banner capability.

### Provider-owned Contracts

Notify owns transport-neutral sender and delivery-receipt types under `contracts/`. Provider-specific runtime declarations and optional action types belong to the contributing adapter. Providers supply configuration schemas, translations, conditional fields, configured-secret metadata and test fields; the gateway forwards them without assuming a transport. Notify contributes the email validation policy to Auth. Email delivery and factory capabilities exist only when an adapter provides them.

Configuration fields may provide an optional localized `infoKey`; the shared editor presents that help in an information tooltip beside the label. Blank numeric fields are omitted from configuration patches rather than converted to zero.

Providers may implement the optional pure `normalizeConfig(patch)` hook to normalize configuration without changing runtime state. Notify merges the normalized patch with the saved configuration, preserving omitted fields, and persists the result before applying it to the sender. If runtime application fails, Notify disables the provider, restores the previous persisted configuration with `enabled: false`, and returns an explicit error. An administrator must correct the configuration and recover the provider before ordinary delivery resumes.

Configuration saves, patches, activation changes and persisted reloads are serialized per sender, including failed-save rollback. Different senders remain independent. Replacing a registered sender while its configuration work is pending fails explicitly; replacement can proceed once that work finishes. Configuration listeners run after the transaction is released, so they may await a subsequent update. The `notify:onSenderConfigChange` payload excludes all fields declared as `password` in the provider schema or listed by `getConfiguredSecretFields()`, including newly submitted values. Public normalized fields and activation state remain available; listeners must not rely on raw credentials.

Adapter contract registration follows [the shared gateway bootstrap contract](/docs/gateways).

### Reliable Sharing and Tests

Administrator configuration tests are available before a sender is enabled. Testing does not activate normal delivery; each provider owns its diagnostic transport and cleanup.

### Typed Delivery Contracts

Sender queue inspection is optional and typed by the Notify contract. Bootstrap loads the gateway-owned store directly and exposes its email and preference operations without partial constructor assertions. Broadcast validation returns validated roles and scheduling values before persistence.

### Onboarding Email Verification

Notify contributes notify:email:add and notify:email:verify to auth:onboarding during its bootstrap. They accept only {email} and {email, code}; account identity comes from verified onboarding context. They reuse ordinary email-add and verification rules, including duplicate-address checks, delivery availability, code lifetime and cooldown errors. They do not allow email listing, deletion, primary-address changes, other-account access or notification administration.

Handlers recheck current authority before effects after asynchronous reads. Disabling or removing Notify removes the operations. Missing optional email operations may be skipped only when the selected registration policy does not require email; registered delivery failures remain errors. Verification codes and email links retain their separate lifetimes and do not create login sessions. The existing signed-in email settings tutorial is unchanged.

An address may already be stored when delivery or revocation fails; a valid code may be consumed before a later authority check or database failure. Retry only after checking the current state.

### Administration Drafts

Notification and broadcast drafts remain in memory during redraws of the same Administration page. If navigation asks about unsaved changes, Stay retains the draft and Discard and Leave drops it. Discard restores the initial form values. Drafts are not saved across browser reloads or tab closure, and changing accounts clears them.

Send and Create accept one request at a time, including validation; their controls are unavailable while pending. A rejected submission retains its draft. Success restores the original defaults only if the draft still matches the submitted values. Newer edits made while waiting remain unchanged and unsaved. General Settings Save never sends a notification or publishes a broadcast.

Broadcast status changes are also single-flight. A successful creation or status change remains successful if the following list refresh fails. The refresh error is reported separately, and previously loaded rows remain visible. Check the current state before repeating an action; there is no automatic retry. Closing or replacing acknowledgement details, leaving the page or changing accounts prevents older detail responses from updating the current view.

Use Refresh beside Create Broadcast to reload only the list with a read-only request, including after a loading error. It retains your draft and never repeats creation or a status change. Refresh is unavailable while another broadcast action is pending.
