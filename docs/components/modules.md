# Modules Component

## Purpose
`modules/` stores compile-time extension modules.

## Lifecycle model
- install
- enable
- disable
- uninstall
- integrity-check (compare provided file SHA256 values against deployed files)

## Classification
- `core`: immutable runtime modules.
- `extension`: runtime-toggleable modules.

## Manifest change policy
- Every module manifest must track all files it provides via `files[]` (`path` + `sha256`).
- Bump the module `version` whenever any provided file contents change so integrity expectations stay aligned with releases.
