# Guided Tutorials

These guides explain the actions available in this component.

## Use A Guide

Visit a page below to start its unseen guide. Use the ? beside the page title to replay a completed guide; Skip leaves a replay.

## Technical Specification

| Page / surface                          | Guide                    | Access         |
| --------------------------------------- | ------------------------ | -------------- |
| `/settings` · `#notif-matrix-container` | Notification Preferences | Signed-in user |
| `/administration` · `#notifications`    | Notification Delivery    | Administrator  |
| `/administration` · `#broadcasts`       | Broadcast Administration | Administrator  |

Guides register through the public `ui:tutorials` capability with component-owned definitions, catalogs, targets and lifetime signals. Page matching, visible sections and access requirements determine availability. Removal of the component releases its guides. Shared presentation and completion behavior are documented in the [host tutorial contract](/docs/tutorials).

Optional test-delivery and publication controls are included only while available; repeated test buttons use one visible target.

Registration validates guide titles and steps against the gateway's own catalog before making guides available. English, German, Indonesian and Japanese are supported; missing or empty preferred-language values use the same English key. Missing English text remains an explicit translation error. Registering guides on another dashboard page does not navigate to Settings or Administration.
