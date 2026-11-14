# Guided Tutorials

These guides explain the actions available in this component.

## Use A Guide

Visit a page below to start its unseen guide. Use the ? beside the page title to replay a completed guide; Skip leaves a replay.

## Technical Specification

| Page / surface                             | Guide            | Access         |
| ------------------------------------------ | ---------------- | -------------- |
| `/settings` · `#auth-security-reset-panel` | Account Security | Signed-in user |

Guides register through the public `ui:tutorials` capability with component-owned definitions, catalogs, targets and lifetime signals. Page matching, visible sections and access requirements determine availability. Removal of the component releases its guides. Shared presentation and completion behavior are documented in the [host tutorial contract](/docs/tutorials).

## Bounded challenge delivery

For Email Code, “queued” means delivery is still pending, not sent. Wait for the latest code. A resend replaces the previous code only when accepted; a rejected resend leaves it unchanged. After delivery failure, explicitly resend before the attempt expires, or start a new login. Login attempts last five minutes and setup lasts ten minutes. Cancelling setup affects only that setup. Resuming a login does not send another email or extend its deadline.
