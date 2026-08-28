# Safer keyring setup

**Feature Branch:** feature-require-password-confirmation-on-keyring-setup

## Confirm new keyring passwords

First-login and recreated-keyring setup now asks users to repeat a custom keyring password and prevents creation when the entries differ.

## Consistent password forms

Every keyring password popup now uses the shared form composer, clearly marks required fields, and applies consistent validation and layout. Password confirmation criteria say that passwords match when their success tick appears. The “Use User Password” action applies the credential already verified during login, allowing the keyring to unlock automatically on later password logins without another prompt. Destroying a keyring takes effect before recreation and keeps setup required when recreation is cancelled. Password-form styles now load before keyring dialogs open, restoring balanced full-width fields and animated validation criteria. Deleted-account vault cleanup runs after other dependency cleanup and is verified across repeated LDAP deletion cycles. Keyring creation now includes the automatic lock timeout. Failed manual unlocks remain retryable without refreshing Settings. After manual destruction, Settings shows a “No Keyring Found” banner with creation as the only available action; password-based login unlock attempts remain silent and preserve the configured timeout session. Settings now restores a still-valid browser-session unlock before rendering keyring status, and the destructive clear confirmation consistently uses cancel styling. Failed manual unlocks remain retryable.

## Reset deleted users' keyrings

Account-instance identities distinguish deleted and recreated users from vaults that have not synchronized yet. Reusing a username starts with first-time keyring setup, while a temporary failed upload cannot erase the only encrypted local copy. Browser keyring state is erased when account deletion invalidates the active session. Access-denied handling returns through the server session resolver so deleted users see “Account Deleted” instead of the generic session-expired notice.

## Reliable setup actions

Cancelling keyring creation no longer leaves its Settings action unresponsive. Automatic-lock choices now share one definition across setup and Settings, and account-password creation uses the visual treatment for a creative action.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/77460b6c93444a0c0c8d467b879551c38dedcc41
