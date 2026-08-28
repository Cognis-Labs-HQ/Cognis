# Localized Module Discovery

**Feature Branch:** feature-find-solution-for-unresolved-string-keys

## Module names load immediately

The module marketplace now caches and serves each discovered module's localized strings, so names, summaries, categories, and tags are translated before installation on the first marketplace load.

## Core stays in the core runtime

The external module route loader now ignores core manifests, preventing it from looking for Cognis Core inside the external module installation directory.

## Marketplace loader structure is clearer

Marketplace loading now lives in a focused directory with catalog discovery, repository access, and the public service separated into smaller files that remain comfortably below the source-size limit.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6f98263dd67dd20b8b86d4bed66c4ace97b3d296
