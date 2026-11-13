# TOTP Adapter

This adapter owns the `COGNIS_TOTP_ISSUER` override. Invalid codes use the common `invalid_verification_code` error, so the gateway does not need provider-specific error handling.

## Purpose

Provides time-based one-time password verification for the TFA gateway.

## Setup Flow

1. The adapter generates a Base32 secret.
2. It returns `manualSecret` and `qrSvg` for setup UI rendering.
3. The user confirms setup with a 6-digit code.
4. On success, state stores `secret`, `algorithm`, `digits`, and `period`.

## Verification Rules

- Token length: `6` digits.
- Time step: `30` seconds.
- Allowed drift: previous, current, and next window.
- Default algorithm: `SHA256`.
- Supported algorithms: `SHA1`, `SHA256`, `SHA512`.

## Configuration

The adapter exposes one admin setting:

- `algorithm` — HMAC algorithm used for setup verification and login verification.

The method declares its login placeholder, language base and configuration labels; the gateway renders that metadata without a provider-ID branch.

## Type Contracts

The adapter owns a narrow declaration for the QR renderer’s promise-based SVG operation, including correction level, margin and width options. Setup tests exercise the real renderer. Code length, algorithm selection and verification windows are unchanged.
