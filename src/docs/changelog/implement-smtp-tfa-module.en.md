# SMTP TFA Isolation

## Rename SMTP TFA adapter identity

Renamed the auth adapter ID and package identity from `email-tfa` to `smtp-tfa` while keeping user-facing labels as “Email TFA”.

## Remove hardcoded adapter-id dependency in auth gateway

Updated auth gateway TFA adapter resolution to detect adapters by capability hooks instead of fixed adapter IDs, so gateway behavior is adapter-driven.

## Show adapter dependencies in settings popup

Adapter settings popups now display dependency links using the same link behavior as component dependency links, including adapter targets.

## Move SMTP TFA coverage to adapter tests

Removed SMTP TFA behavior test coverage from auth gateway tests and added dedicated adapter tests under `src/adapters/auth/smtp-tfa/tests/`.

## Add admin TFA controls

Added a new Administration → Security TFA area with available and active method tables, drag-and-drop activation, and an enforcement toggle that disables when no functional methods are available.

## Enforce new-user TFA onboarding

Added mandatory TFA onboarding flow for new users when enforcement is enabled, including setup-status APIs and non-dismissible setup popups that can require verified email before SMTP TFA activation.

## Move TFA Method Tables to User Preferences

Moved the Available/Active TFA method drag-and-drop tables from Administration to User Preferences security settings, while keeping enforcement control in Administration.

## Add SMTP Setup Challenge During Activation

Activating SMTP TFA now triggers an emailed setup code challenge flow in a popup so users must verify the setup before the method becomes active.

## Render Login TFA Prompt In Auth Panel

Login now renders the TFA verification prompt directly in the auth panel and supports method tabs when multiple verification media are available, hiding tabs when there is only one method.
