# Credential Catalog Freshness

**Feature Branch:** feature-module-credential-translation

## Refresh mutable translations before use

Host translation catalogs at mutable language URLs now wait for a shared network refresh before rendering. A network failure or the existing four-second timeout retains an available cached catalog. Content-hashed catalogs remain cache-first; other public assets retain their existing refresh policy.

## Keep credential help localized

Module source forms retain their existing English, German, Indonesian and Japanese credential guidance. Missing preferred-language values use English; missing English values still fail explicitly. Regression coverage exercises source editor transitions, repeated openings, stored credentials and cache recovery.

## Commits

- [e8fcba6b2264bf38d5283e8d7f2ca6f9745a210c](https://github.com/Cognis-Labs-HQ/Cognis/commit/e8fcba6b2264bf38d5283e8d7f2ca6f9745a210c)
- [2fefc8a0444b39badc9be1353af43413486b9c98](https://github.com/Cognis-Labs-HQ/Cognis/commit/2fefc8a0444b39badc9be1353af43413486b9c98)
