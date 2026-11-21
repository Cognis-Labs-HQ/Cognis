# Notification Guide Coverage

**Feature Branch:** feature-notify-tutorial-loading

## Verify notification guide catalogs

Regression coverage checks the Notification Preferences, Notification Delivery and Broadcast Administration guide registrations against their English, German, Indonesian and Japanese catalogs. The notification tutorial documentation explains catalog ownership and English fallback.

## Verify cached guide registration

The host tutorial regression now exercises the service worker together with localization and staged registration. It verifies refresh of an older gateway catalog before registration, English fallback, repeated offline registration and explicit failure for missing translations.

## Commits

- [2086c81a8d0d28fe8e72e8946df0e977b89fca6e](https://github.com/Cognis-Labs-HQ/Cognis/commit/2086c81a8d0d28fe8e72e8946df0e977b89fca6e)
