# Credential Catalog Freshness

**Feature Branch:** feature-module-credential-translation

## Refresh mutable translations before use

Host translation catalogs at mutable language URLs now wait for a shared network refresh before rendering. A network failure or the existing four-second timeout retains an available cached catalog. Content-hashed catalogs remain cache-first; other public assets retain their existing refresh policy.

## Keep credential help localized

Module source forms retain their existing English, German, Indonesian and Japanese credential guidance. Missing preferred-language values use English; missing English values still fail explicitly. Regression coverage exercises source editor transitions, repeated openings, stored credentials and cache recovery.

## Commits

- [018fd0697080bf608bb962e4ad39d659afecbc63](https://github.com/Cognis-Labs-HQ/Cognis/commit/018fd0697080bf608bb962e4ad39d659afecbc63)
- [2d5a53eab3b8ce07b9eb41d78078a4cb0b6fb70a](https://github.com/Cognis-Labs-HQ/Cognis/commit/2d5a53eab3b8ce07b9eb41d78078a4cb0b6fb70a)
- [35fbcec366050e04893571c865adbd94d9496f0b](https://github.com/Cognis-Labs-HQ/Cognis/commit/35fbcec366050e04893571c865adbd94d9496f0b)
