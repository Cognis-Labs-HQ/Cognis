# Safer keyring setup

## Confirm new keyring passwords

First-login and recreated-keyring setup now asks users to repeat a custom keyring password and prevents creation when the entries differ.

## Consistent password forms

Every keyring password popup now uses the shared form composer, clearly marks required fields, and applies consistent validation and layout. Password confirmation criteria say that passwords match when their success tick appears.

## Reset deleted users' keyrings

Deleting a user now makes the server's empty keyring state authoritative, so reusing the username starts with the first-time keyring setup instead of a browser's old encrypted copy.
