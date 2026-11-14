# Guided Tutorials

These guides explain the actions available in this component.

## Use A Guide

Visit a page below to start its unseen guide. Use the ? beside the page title to replay a completed guide; Skip leaves a replay.

The invitation options guide explains recipient correction. Send Invite Email uses a required email field with localized feedback and returns focus to the field when correction is needed. Create invite and Enter share validation. Closing the dialog discards the unfinished recipient; reopening starts empty. Registration tokens and invitation history keep their existing controls.

## Technical Specification

| Page / surface                      | Guide               | Access         |
| ----------------------------------- | ------------------- | -------------- |
| `/invite`                           | Invitation Guide    | Signed-in user |
| `/administration` · `#registration` | Registration Policy | Administrator  |

Guides register through the public `ui:tutorials` capability with component-owned definitions, catalogs, targets and lifetime signals. Page matching, visible sections and access requirements determine availability. Removal of the component releases its guides. Shared presentation and completion behavior are documented in the [host tutorial contract](/docs/tutorials).
