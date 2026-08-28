# TFA Removal Confirmation

**Feature Branch:** feature-restrict-tfa-removal-behind-password-confirmation

## Password confirmation protects TFA removal

Removing an enabled two-factor authentication method from the current account now uses the existing password re-prompt guard before the settings change is applied. Cancelling the prompt leaves the pending security settings unchanged.

## SMTP setup explains email requirements

SMTP two-factor setup now shows a warning explaining that a verified primary email address is required instead of presenting a generic setup error.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/f524f2f62820dbbf6ff80366a835aca0f31d3359
