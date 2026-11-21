# Reliable Notification Drafts

**Feature Branch:** feature-notify-admin-lifecycle

## Keep drafts until you choose

Notification and broadcast drafts survive same-page redraws. Stay preserves unsaved work, while Discard restores defaults. Only Send Notification or Create Broadcast publishes; general Settings Save does not. Successful submission resets an unchanged draft, while newer edits and rejected submissions remain available.

## Separate publication and refresh

Pending submissions and status changes cannot be repeated. Broadcast refresh failures are reported separately from successful mutations and keep the previous list visible. Late acknowledgement details cannot reopen a closed or replaced view. Enabled and Disabled labels and the updated guides are translated into all four supported languages.

A separate Refresh action retries only list loading, preserves the draft and never repeats a successful creation or status change.

## Commits

- [d3cd50083ed212817eda70f02dbaf59d0adb60a6](https://github.com/Cognis-Labs-HQ/Cognis/commit/d3cd50083ed212817eda70f02dbaf59d0adb60a6)
- [e9aca7eea535a572cdf46c3c5c7a385edd76bef6](https://github.com/Cognis-Labs-HQ/Cognis/commit/e9aca7eea535a572cdf46c3c5c7a385edd76bef6)
