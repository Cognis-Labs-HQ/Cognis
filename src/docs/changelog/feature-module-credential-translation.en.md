# Credential Catalog Freshness

**Feature Branch:** feature-module-credential-translation

## Refresh mutable translations before use

Host translation catalogs at mutable language URLs now wait for a shared network refresh before rendering. A network failure or the existing four-second timeout retains an available cached catalog. Content-hashed catalogs remain cache-first; other public assets retain their existing refresh policy.

## Keep credential help localized

Module source forms retain their existing English, German, Indonesian and Japanese credential guidance. Missing preferred-language values use English; missing English values still fail explicitly. Regression coverage exercises source editor transitions, repeated openings, stored credentials and cache recovery.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e01bd17a1da792c21b0e71e331678721bb7b7c00
