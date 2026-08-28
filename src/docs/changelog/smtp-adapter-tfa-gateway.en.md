# TFA Gateway Fixes

**Feature Branch:** copilot/smtp-adapter-tfa-gateway

## Enable requests no longer fail; TOTP enabled by default; SMTP TFA state follows SMTP Notification

Enable requests in the TFA gateway no longer fail when an adapter has not been explicitly configured in the database. The TOTP adapter is now enabled by default on fresh installations because it has no external dependencies. The SMTP TFA adapter's availability is now tethered to the SMTP Notification adapter: if SMTP sending is not configured, SMTP-based two-factor authentication is automatically unavailable and the toggle is locked in Administration. Enabling or disabling a TFA adapter no longer overwrites its saved configuration. The default verification code length for the SMTP TFA adapter is six digits.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/93e0a59123d977c14b058e65dab3d9d42ebd011b
