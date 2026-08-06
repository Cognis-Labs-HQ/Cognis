# Safer Performance Telemetry

## Hardened browser telemetry

Browser performance submissions now require an authenticated session, enforce per-account rate limits, cap metric batches, preserve document metrics across SPA navigation, and calculate CLS using Web Vitals session windows.

## Safer edge defaults

Deferred origins bind to loopback by default and preserve trusted forwarding headers. Setup provisions an initial self-signed certificate, and hashed assets use the complete esbuild hash alphabet.
