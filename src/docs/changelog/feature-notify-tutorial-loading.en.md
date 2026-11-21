# Notification Guide Coverage

**Feature Branch:** feature-notify-tutorial-loading

## Verify notification guide catalogs

Regression coverage checks the Notification Preferences, Notification Delivery and Broadcast Administration guide registrations against their English, German, Indonesian and Japanese catalogs. The notification tutorial documentation explains catalog ownership and English fallback.

## Verify cached guide registration

The host tutorial regression now exercises the service worker together with localization and staged registration. It verifies refresh of an older gateway catalog before registration, English fallback, repeated offline registration and explicit failure for missing translations.

## Commits

- [259a14e8891311577230fe8d391a80b0aefacd10](https://github.com/Cognis-Labs-HQ/Cognis/commit/259a14e8891311577230fe8d391a80b0aefacd10)
