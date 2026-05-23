# SMTP TFA Isolation

## Rename SMTP TFA adapter identity

Renamed the auth adapter ID and package identity from `email-tfa` to `smtp-tfa` while keeping user-facing labels as “Email TFA”.

## Remove hardcoded adapter-id dependency in auth gateway

Updated auth gateway TFA adapter resolution to detect adapters by capability hooks instead of fixed adapter IDs, so gateway behavior is adapter-driven.

## Show adapter dependencies in settings popup

Adapter settings popups now display dependency links using the same link behavior as component dependency links, including adapter targets.

## Move SMTP TFA coverage to adapter tests

Removed SMTP TFA behavior test coverage from auth gateway tests and added dedicated adapter tests under `src/adapters/auth/smtp-tfa/tests/`.
