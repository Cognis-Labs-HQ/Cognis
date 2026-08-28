# File namespace review cleanup

**Feature-Zweig:** N/A

## Namespace declarations are component-owned

Social profile and messages now declare their owned and external file namespaces in their manifests, while UI API calls use namespace constants instead of inline literals.

## Share API helpers are gateway-owned

The Share gateway now exports reusable client helpers for share-token callbacks so modules can consume one consistent implementation.

## Version and documentation cleanup

Removed unrelated work changelog files, synchronized the version index variants, and relaxed the memory database core dependency to a compatible semver range.

## Änderungen
