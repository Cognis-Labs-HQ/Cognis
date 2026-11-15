# Guided Tutorials

These guides explain the actions available in this component.

## Use A Guide

Visit a page below to start its unseen guide. Use the ? beside the page title to replay a completed guide; Skip leaves a replay.

## Technical Specification

| Page / surface                         | Guide                  | Access         |
| -------------------------------------- | ---------------------- | -------------- |
| `/settings` · `#tfa-settings-panel`    | Two-Factor Security    | Signed-in user |
| `/administration` · `#tfa-enforcement` | Two-Factor Enforcement | Administrator  |

Guides register through the public `ui:tutorials` capability with component-owned definitions, catalogs, targets and lifetime signals. Page matching, visible sections and access requirements determine availability. Removal of the component releases its guides. Shared presentation and completion behavior are documented in the [host tutorial contract](/docs/tutorials).

Recovery-code guidance explains signing in when the second factor is unavailable. Enforcement guidance highlights its switch rather than the whole panel.

## Bounded challenge delivery

For Email Code, “queued” means delivery is still pending, not sent. Wait for the latest code. A resend replaces the previous code only when accepted; a rejected resend leaves it unchanged. After delivery failure, explicitly resend before the attempt expires, or start a new login. Login attempts last five minutes and setup lasts ten minutes. Cancelling setup affects only that setup. Resuming a login does not send another email or extend its deadline.

## Resend feedback

When the active method’s resend request finishes, the login prompt shows its result. A queued or sent receipt describes the reported delivery state; a valid response without a receipt only confirms that the method responded. A rejected, malformed or interrupted result does not prove whether delivery occurred. Check for a code before trying again. If the attempt has expired, cancel and sign in again. Cooldowns remain server-controlled, pending requests stay locked, and no retry or email is sent automatically.

While a resend remains unresolved, its action reads “Requesting code…” and exposes a busy state. It stays locked without inventing a new deadline or retrying. If the resend finishes during Cancel and cancellation later fails, the same prompt reconciles the settled result, pending lock and issued deadline. A relative server wait is anchored when its response arrives, so time spent waiting for cancellation does not restart it.
