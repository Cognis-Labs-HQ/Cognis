# SMTP TFA Adapter

The Email Code method sends one-time setup and login codes using the Notification gateway’s SMTP sender. Code length belongs to that sender’s delivery policy; TFA consumes the policy through ctx.

## Usage Examples

1. In Administration, configure and enable SMTP under the Notification gateway.
2. Set **Code Length** there, for example to 8 digits, and save. New email-verification codes and Email Code TFA setup and login codes use that value.
3. In Settings, enable Email Code TFA and enter the code sent to the account’s verified primary email address. During login, enter the code from the latest challenge; resend issues a replacement using the current policy.

## Technical Specification

### Requirements

- The Notification gateway’s SMTP sender must be configured and enabled.
- The SMTP owner must provide `notify:emailDeliveryPolicy` version 1, email availability and delivery through ctx. An absent, disabled or unconfigured owner causes new challenges to fail explicitly.
- The user account must have a verified primary email address.

### Configuration and Persistence

The Notification SMTP **Code Length** field is the sole editable and persisted authority for email verification and Email Code TFA. The default is 6 digits, normalized to an integer and clamped to 4–10 digits. TFA has no separate editable or persisted code-length setting and never supplies a replacement policy when the owner is unavailable.

### Delivery Policy and Challenges

Code length and resend interval come from the current `notify:emailDeliveryPolicy` at issuance. Shared verification helpers generate cryptographically random digits. Saving a different length applies to subsequent challenges, including replacement codes issued by resend. Already-issued setup and login codes retain their original length until used, replaced or expired; a settings change does not reinterpret them. Input-length metadata describes the issued challenge, not a later policy value.

Challenge codes are stored in process memory. Restarting the app or disabling the method invalidates pending setup and login codes. Multi-instance deployments must pin requests to the same instance throughout a challenge window.

### Registration and Lifecycle

The adapter registers its code-message action during bootstrap through `notify:registerEmailPurpose` and sends through `notify:sendEmail`. It owns registration, message content and challenge state; the TFA gateway supplies neutral adapter lifecycle hooks. Disabling the gateway cancels its SMTP queue and pending challenges. Re-enabling creates a fresh registration without restoring old challenges. Login presentation and language resources belong to this method.
