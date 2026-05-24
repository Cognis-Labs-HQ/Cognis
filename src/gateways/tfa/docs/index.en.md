# TFA Gateway

## Purpose

Manages two-factor authentication methods, login verification, recovery codes, and enforcement state.

## Responsibilities

- Discover and load TFA method adapters from `src/adapters/tfa/*`.
- Expose setup, enable/disable, and preference endpoints for methods.
- Handle login challenge verification through configured methods.
- Generate and track recovery codes with usage status.
- Report enforcement state so UI routing can require setup.

## Main API Surface

- `GET /api/v1/tfa/methods`
- `POST /api/v1/tfa/methods/:id/setup/begin`
- `POST /api/v1/tfa/methods/:id/setup/verify`
- `POST /api/v1/tfa/methods/:id/setup/cancel`
- `POST /api/v1/tfa/methods/:id/enable`
- `POST /api/v1/tfa/methods/:id/disable`
- `PUT /api/v1/tfa/methods/preferences`
- `GET /api/v1/tfa/recovery-codes`
- `POST /api/v1/tfa/recovery-codes/rotate`
- `GET /api/v1/tfa/status`
