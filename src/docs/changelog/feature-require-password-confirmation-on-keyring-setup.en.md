# Safer keyring setup

## Confirm new keyring passwords

First-login and recreated-keyring setup now asks users to repeat a custom keyring password and prevents creation when the entries differ.

## Consistent password forms

Every keyring password popup now uses the shared form composer, clearly marks required fields, and applies consistent validation and layout. Password confirmation criteria say that passwords match when their success tick appears. The “Use User Password” action applies the credential already verified during login, allowing the keyring to unlock automatically on later password logins without another prompt. Destroying a keyring takes effect before recreation and keeps setup required when recreation is cancelled. Password-form styles now load before keyring dialogs open, restoring balanced full-width fields and animated validation criteria. Deleted-account vault cleanup runs after other dependency cleanup and is verified across repeated LDAP deletion cycles. Keyring creation now includes the automatic lock timeout. Failed manual unlocks remain retryable without refreshing Settings. After manual destruction, Settings shows a “No Keyring Found” banner with creation as the only available action; password-based login unlock attempts remain silent and preserve the configured timeout session.

## Reset deleted users' keyrings

Deleting a user now makes the server's empty keyring state authoritative, so reusing the username starts with the first-time keyring setup instead of a browser's old encrypted copy. Browser keyring state is now erased when account deletion invalidates the active session. Access-denied handling returns through the server session resolver so deleted users see “Account Deleted” instead of the generic session-expired notice.
