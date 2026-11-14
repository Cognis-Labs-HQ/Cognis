# Notification Guide Coverage

**Feature Branch:** feature-notify-tutorial-loading

## Verify notification guide catalogs

Regression coverage checks the Notification Preferences, Notification Delivery and Broadcast Administration guide registrations against their English, German, Indonesian and Japanese catalogs. The notification tutorial documentation explains catalog ownership and English fallback.

## Verify cached guide registration

The host tutorial regression now exercises the service worker together with localization and staged registration. It verifies refresh of an older gateway catalog before registration, English fallback, repeated offline registration and explicit failure for missing translations.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/eec701ecd4b8577c474ed0cb038dff87f08e51d6
