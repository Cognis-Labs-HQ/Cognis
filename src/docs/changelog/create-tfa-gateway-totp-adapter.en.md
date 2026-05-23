# TFA Gateway & TOTP

## Add New TFA Gateway
Added a dedicated `tfa` gateway with adapter discovery under `src/adapters/tfa/*`, user method APIs, recovery-code lifecycle APIs, and admin reset endpoints.

## Add TOTP Adapter
Added a `totp` adapter under `src/adapters/tfa/totp` with setup verification and login-code verification.

## Integrate Login and Security
Updated login and security flows for two-factor prompts, enforced setup redirects, Administration security enforcement toggles, and user-level TFA reset actions.
